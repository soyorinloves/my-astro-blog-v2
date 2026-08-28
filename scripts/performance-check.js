/**
 * 性能检查脚本
 * 比较当前性能与基准，检测性能回归
 */

import { readFileSync } from "fs";
import { join } from "path";
import { globSync } from "glob";

/**
 * 从 LHCI JSON 报告文件中提取指标
 */
function extractMetricsFromReport(reportPath) {
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf-8"));
    const results = {};

    if (report.results) {
      for (const result of report.results) {
        const url = result.requestedUrl;
        const categories = result.categories || {};
        const audits = result.audits || {};

        results[url] = {
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
        };
      }
    }

    return results;
  } catch (err) {
    console.error("Failed to parse LHCI report:", err.message);
    return {};
  }
}

/**
 * 加载性能基准
 */
function loadBaseline(baselinePath) {
  try {
    const data = JSON.parse(readFileSync(baselinePath, "utf-8"));
    return {
      baseline: data.baseline,
      thresholds: data.thresholds,
    };
  } catch (err) {
    console.error("Failed to load baseline file:", err.message);
    return {
      baseline: {},
      thresholds: { regressionPercent: 10 },
    };
  }
}

/**
 * 检查性能回归
 */
function checkPerformanceRegression(currentMetrics, baselineMetrics, thresholds) {
  const regressions = [];

  for (const [metric, currentValue] of Object.entries(currentMetrics)) {
    const baselineValue = baselineMetrics[metric];
    if (baselineValue === undefined || baselineValue === 0) continue;

    const percentChange = ((currentValue - baselineValue) / baselineValue) * 100;

    if (percentChange > thresholds.regressionPercent) {
      regressions.push({
        metric,
        current: currentValue,
        baseline: baselineValue,
        percent: percentChange,
      });
    }
  }

  return regressions;
}

/**
 * 主函数
 */
async function main() {
  const baselinePath = join(process.cwd(), "performance-baseline.json");
  const lhciDir = join(process.cwd(), ".lighthouseci");

  console.log("Loading baseline...");
  const { baseline, thresholds } = loadBaseline(baselinePath);

  console.log("Extracting metrics from reports...");
  const reportFiles = globSync(join(lhciDir, "lhr-*.json"));
  const currentMetrics = {};

  for (const reportPath of reportFiles) {
    const metrics = extractMetricsFromReport(reportPath);
    Object.assign(currentMetrics, metrics);
  }

  console.log("\n=== Performance Regression Check ===\n");

  let hasRegressions = false;

  for (const [url, metrics] of Object.entries(currentMetrics)) {
    const urlKey = Object.keys(baseline).find((key) => baseline[key].url === url);
    if (!urlKey) continue;

    const baselineMetrics = baseline[urlKey].metrics;
    const regressions = checkPerformanceRegression(metrics, baselineMetrics, thresholds);

    if (regressions.length > 0) {
      hasRegressions = true;
      console.log(`Regressions found for: ${url}\n`);

      for (const reg of regressions) {
        console.log(`  ❌ ${reg.metric}`);
        console.log(`     Current: ${reg.current.toFixed(2)}`);
        console.log(`     Baseline: ${reg.baseline.toFixed(2)}`);
        console.log(`     Change: +${reg.percent.toFixed(1)}%\n`);
      }
    } else {
      console.log(`✅ ${url} - No regressions found`);
    }
  }

  console.log("\n=== Summary ===");
  if (hasRegressions) {
    console.log("⚠️  Performance regressions detected!");
    console.log("Please investigate and fix before merging.");
    process.exit(1);
  } else {
    console.log("✅ All performance checks passed!");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("Error running performance check:", error);
  process.exit(1);
});
