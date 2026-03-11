import mongoose from "mongoose";

const cropScanReportSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true
		},
		cropType: {
			type: String,
			required: true,
			trim: true,
			maxlength: 80
		},
		detectedCrop: {
			type: String,
			required: true,
			trim: true,
			maxlength: 80
		},
		primaryIssue: {
			type: String,
			required: true,
			trim: true,
			maxlength: 120
		},
		healthScore: {
			type: Number,
			required: true,
			min: 0,
			max: 100
		},
		farmStatus: {
			type: String,
			required: true,
			trim: true,
			maxlength: 30
		},
		location: {
			city: {
				type: String,
				trim: true,
				maxlength: 80,
				default: "Unknown City"
			},
			state: {
				type: String,
				trim: true,
				maxlength: 80,
				default: "Unknown Region"
			}
		},
		riskSnapshot: {
			diseaseSpreadRisk: {
				type: String,
				trim: true,
				maxlength: 20,
				default: "Unknown"
			},
			pestSpreadRisk: {
				type: String,
				trim: true,
				maxlength: 20,
				default: "Unknown"
			},
			weatherRiskImpact: {
				type: String,
				trim: true,
				maxlength: 20,
				default: "Unknown"
			}
		}
	},
	{
		timestamps: true
	}
);

cropScanReportSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.CropScanReport || mongoose.model("CropScanReport", cropScanReportSchema);
