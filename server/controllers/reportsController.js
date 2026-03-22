import {
  fetchOverview,
  fetchMarketTrends,
  fetchDemandSupply,
  fetchCropPerformance,
  fetchRegionAnalysis,
  fetchAIPerformance,
  fetchUserAnalytics,
  generateAIInsights
} from "../services/reportsService.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const ok = (res, data) => res.json({ success: true, data });
const err = (res, e, msg = "Server error") => {
  console.error(msg, e);
  res.status(500).json({ success: false, message: msg });
};

const getFilters = (q) => ({
  from:   q.from   || null,
  to:     q.to     || null,
  crop:   q.crop   || null,
  region: q.region || null
});

export const getOverview        = async (req, res) => { try { ok(res, await fetchOverview()); } catch (e) { err(res, e, "Overview failed"); } };
export const getMarketTrends    = async (req, res) => { try { ok(res, await fetchMarketTrends(getFilters(req.query))); } catch (e) { err(res, e, "Market trends failed"); } };
export const getDemandSupply    = async (req, res) => { try { ok(res, await fetchDemandSupply(getFilters(req.query))); } catch (e) { err(res, e, "Demand supply failed"); } };
export const getCropPerformance = async (req, res) => { try { ok(res, await fetchCropPerformance(getFilters(req.query))); } catch (e) { err(res, e, "Crop performance failed"); } };
export const getRegionAnalysis  = async (req, res) => { try { ok(res, await fetchRegionAnalysis(getFilters(req.query))); } catch (e) { err(res, e, "Region analysis failed"); } };
export const getAIPerformance   = async (req, res) => { try { ok(res, await fetchAIPerformance()); } catch (e) { err(res, e, "AI performance failed"); } };
export const getUserAnalytics   = async (req, res) => { try { ok(res, await fetchUserAnalytics(getFilters(req.query))); } catch (e) { err(res, e, "User analytics failed"); } };

export const getAIInsights = async (req, res) => {
  try {
    const [overview, demandSupply, cropPerformance, regionAnalysis] = await Promise.all([
      fetchOverview(),
      fetchDemandSupply({}),
      fetchCropPerformance({}),
      fetchRegionAnalysis({})
    ]);
    const insights = await generateAIInsights({ overview, demandSupply, cropPerformance, regionAnalysis });
    ok(res, { insights });
  } catch (e) {
    err(res, e, "AI insights failed");
  }
};

export const generateReport = async (req, res) => {
  try {
    const filters = req.body?.filters || {};
    const format  = (req.body?.format || "pdf").toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);

    const [overview, marketTrends, demandSupply, cropPerformance, regionAnalysis, aiPerformance, userAnalytics] = await Promise.all([
      fetchOverview(),
      fetchMarketTrends(filters),
      fetchDemandSupply(filters),
      fetchCropPerformance(filters),
      fetchRegionAnalysis(filters),
      fetchAIPerformance(),
      fetchUserAnalytics(filters)
    ]);

    // ── Excel ──────────────────────────────────────────────────────
    if (format === "excel") {
      const filename = `agrovision-report-${dateStr}.xlsx`;
      const wb = new ExcelJS.Workbook();
      wb.creator = "AgroVision AI";
      wb.created = new Date();

      // Overview sheet
      const ovSheet = wb.addWorksheet("Overview");
      ovSheet.addRow(["Metric", "Value"]);
      ovSheet.addRow(["Total Listings",    overview?.totalListings  || 0]);
      ovSheet.addRow(["Total Orders",      overview?.totalOrders    || 0]);
      ovSheet.addRow(["Sales Volume (kg)", overview?.totalVolume    || 0]);
      ovSheet.addRow(["Revenue (₹)",       overview?.totalRevenue   || 0]);
      ovSheet.addRow(["AI Accuracy (%)",   overview?.aiAccuracy     || 0]);
      ovSheet.addRow(["Generated At",      new Date().toLocaleString()]);

      // Market Trends sheet
      if (Array.isArray(marketTrends) && marketTrends.length) {
        const mtSheet = wb.addWorksheet("Market Trends");
        const mtKeys = Object.keys(marketTrends[0]);
        mtSheet.addRow(mtKeys);
        marketTrends.forEach((row) => mtSheet.addRow(mtKeys.map((k) => row[k] ?? "")));
      }

      // Crop Performance sheet
      if (Array.isArray(cropPerformance) && cropPerformance.length) {
        const cpSheet = wb.addWorksheet("Crop Performance");
        const cpKeys = Object.keys(cropPerformance[0]);
        cpSheet.addRow(cpKeys);
        cropPerformance.forEach((row) => cpSheet.addRow(cpKeys.map((k) => row[k] ?? "")));
      }

      // Demand Supply sheet
      if (Array.isArray(demandSupply) && demandSupply.length) {
        const dsSheet = wb.addWorksheet("Demand Supply");
        const dsKeys = Object.keys(demandSupply[0]);
        dsSheet.addRow(dsKeys);
        demandSupply.forEach((row) => dsSheet.addRow(dsKeys.map((k) => row[k] ?? "")));
      }

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      await wb.xlsx.write(res);
      return res.end();
    }

    // ── PDF ────────────────────────────────────────────────────────
    const filename = `agrovision-report-${dateStr}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    doc.pipe(res);

    // Title
    doc.fontSize(20).fillColor("#166534").text("AgroVision AI — Analytics Report", { align: "center" });
    doc.fontSize(10).fillColor("#64748b").text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    if (Object.values(filters).some(Boolean)) {
      doc.text(`Filters: ${JSON.stringify(filters)}`, { align: "center" });
    }
    doc.moveDown(1.5);

    // Overview section
    doc.fontSize(14).fillColor("#15803d").text("Platform Overview");
    doc.moveDown(0.4);
    const ovRows = [
      ["Total Listings",    overview?.totalListings  || 0],
      ["Total Orders",      overview?.totalOrders    || 0],
      ["Sales Volume",      `${(overview?.totalVolume || 0).toLocaleString()} kg`],
      ["Revenue Generated", `₹${(overview?.totalRevenue || 0).toLocaleString()}`],
      ["AI Accuracy",       `${overview?.aiAccuracy || 0}%`],
    ];
    ovRows.forEach(([label, value]) => {
      doc.fontSize(10).fillColor("#1e293b").text(`${label}: `, { continued: true }).fillColor("#166534").text(String(value));
    });
    doc.moveDown(1);

    // Market Trends section
    if (Array.isArray(marketTrends) && marketTrends.length) {
      doc.fontSize(14).fillColor("#15803d").text("Market Trends");
      doc.moveDown(0.4);
      marketTrends.slice(0, 10).forEach((row) => {
        const line = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("  |  ");
        doc.fontSize(9).fillColor("#334155").text(line, { ellipsis: true });
      });
      doc.moveDown(1);
    }

    // Crop Performance section
    if (Array.isArray(cropPerformance) && cropPerformance.length) {
      doc.fontSize(14).fillColor("#15803d").text("Crop Performance");
      doc.moveDown(0.4);
      cropPerformance.slice(0, 10).forEach((row) => {
        const line = Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("  |  ");
        doc.fontSize(9).fillColor("#334155").text(line, { ellipsis: true });
      });
      doc.moveDown(1);
    }

    // Footer
    doc.fontSize(8).fillColor("#94a3b8").text("AgroVision AI Platform — Confidential", { align: "center" });

    doc.end();
  } catch (e) {
    err(res, e, "Report generation failed");
  }
};
