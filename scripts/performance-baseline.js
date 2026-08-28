/**
 * 性能基准更新脚本
 * 从 LHCI 报告更新性能基准
 */

import { readFileSync, writeFileSync, promises as fsPromises } from "fs";
import { join } from "path";
import { globSync } from "glob";

function extractMetricsFromReport(report) {
  const results = {};

  for (const result of report.results) {
    const url = result.requestedUrl;
    const categories = result.categories || {};
    const audits = result.audits || {};

    const resourceSummary = audits["resource-summary"];
    const resourceSizes = {
      totalJsKB: 0,
      totalCssKB: 0,
      htmlKB: 0,
      totalKB: 0,
    };

    if (resourceSummary?.details?.items) {
      for (const item of resourceSummary.details.items) {
        const sizeKB = item.size / 1024;
        switch (item.resourceType) {
          case "script":
            resourceSizes.totalJsKB += sizeKB;
            break;
          case "stylesheet":
            resourceSizes.totalCssKB += sizeKB;
            break;
          case "document":
            resourceSizes.htmlKB = sizeKB;
            break;
        }
        resourceSizes.totalKB += sizeKB;
      }
    }

    results[url] = {
      metrics: {
        performance: categories.performance?.score || 0,
        "first-contentful-paint": audits["first-contentful-paint"]?.numericValue || 0,
        "largest-contentful-paint": audits["largest-contentful-paint"]?.numericValue || 0,
        "cumulative-layout-shift": audits["cumulative-layout-shift"]?.numericValue || 0,
        "total-blocking-time": audits["total-blocking-time"]?.numericValue || 0,
        "speed-index": audits["speed-index"]?.numericValue || 0,
        interactive: audits["interactive"]?.numericValue || 0,
        accessibility: categories.accessibility?.score || 0,
        "best-practices": categories["best-practices"]?.score || 0,
        seo: categories.seo?.score || 0,
      },
      resourceSizes,
    };
  }

  return results;
}

function loadBaseline(baselinePath) {
  try {
    return JSON.parse(readFileSync(baselinePath, "utf-8"));
  } catch (err) {
    return {
      baseline: {},
      thresholds: {
        performance: 0.85,
        "first-contentful-paint": 2000,
        "largest-contentful-paint": 4000,
        "cumulative-layout-shift": 0.1,
        "total-blocking-time": 500,
        "speed-index": 4000,
        interactive: 5000,
        regressionPercent: 10,
      },
      schemaVersion: "1.0.0",
      createdAt: new Date().toISOString(),
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const updateMode = args.includes("--update");

  const baselinePath = join(process.cwd(), "performance-baseline.json");
  const lhciDir = join(process.cwd(), ".lighthouseci");

  console.log("Loading baseline...");
  const baselineData = loadBaseline(baselinePath);

  console.log("Looking for LHCI reports...");

  try {
    const reportFiles = globSync(join(lhciDir, "lhr-*.json"));

    if (reportFiles.length === 0) {
      console.error("No LHCI reports found. Run 'pnpm lhci autorun' first.");
      process.exit(1);
    }

    const allMetrics = {};

    for (const reportPath of reportFiles) {
      const report = JSON.parse(readFileSync(reportPath, "utf-8"));
      const metrics = extractMetricsFromReport(report);

      for (const [url, data] of Object.entries(metrics)) {
        if (!allMetrics[url]) {
          allMetrics[url] = { metrics: {}, resourceSizes: { totalJsKB: 0, totalCssKB: 0, htmlKB: 0, totalKB: 0 } };
        }

        // 合并指标（取平均值）
        for (const [key, value] of Object.entries(data.metrics)) {
          if (typeof value === "number") {
            allMetrics[url].metrics[key] = (allMetrics[url].metrics[key] || 0) + value / reportFiles.length;
          }
        }

        // 合并资源大小
        for (const [key, value] of Object.entries(data.resourceSizes)) {
          allMetrics[url].resourceSizes[key] += value / reportFiles.length;
        }
      }
    }

    // 更新基准
    for (const [url, data] of Object.entries(allMetrics)) {
      const urlKey = url.replace("http://localhost:4321", "").replace(/\/$/, "") || "homepage";
      baselineData.baseline[urlKey] = {
        url,
        metrics: data.metrics,
        resourceSizes: data.resourceSizes,
      };
    }

    baselineData.createdAt = new Date().toISOString();

    if (updateMode) {
      console.log("\nUpdating baseline file...");
      writeFileSync(baselinePath, JSON.stringify(baselineData, null, 2));
      console.log("✅ Baseline updated successfully!");
    } else {
      console.log("\n=== Current Performance Metrics ===\n");
      for (const [url, data] of Object.entries(allMetrics)) {
        console.log(`\n${url}:`);
        for (const [key, value] of Object.entries(data.metrics)) {
          if (typeof value === "number") {
            const formatted = key.includes("score") ? value.toFixed(2) : `${(value / 1000).toFixed(2)}s`;
            console.log(`  ${key}: ${formatted}`);
          }
        }
        const rs = data.resourceSizes;
        console.log(`  Resource sizes: ${rs.totalKB.toFixed(1)}KB (JS: ${rs.totalJsKB.toFixed(1)}KB, CSS: ${rs.totalCssKB.toFixed(1)}KB)`);
      }

      console.log("\n\nUse --update flag to save these metrics as the new baseline:");
      console.log("  node scripts/performance-baseline.js --update");
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      console.error(`LHCI directory not found: ${lhciDir}`);
      console.error("Run 'pnpm lhci autorun' first to generate reports.");
      process.exit(1);
    }
    throw err;
  }
}

main().catch((error) => {
  console.error("Error updating baseline:", error);
  process.exit(1);
});
