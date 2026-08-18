import React from 'react';
import { StitchMetrics } from '../lib/api';

export default function MetricsPanel({ metrics }: { metrics: StitchMetrics | null }) {
  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex items-center justify-center min-h-[300px]">
        <p className="text-gray-400">Run digitization to view metrics</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Production Metrics Dashboard</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Total Stitches</p>
          <p className="text-2xl font-bold text-blue-900">{metrics.stitch_count.toLocaleString()}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Est. Run Time</p>
          <p className="text-2xl font-bold text-purple-900">{metrics.estimated_runtime_minutes} min</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg">
          <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Top Thread</p>
          <p className="text-2xl font-bold text-emerald-900">{metrics.top_thread_meters} m</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Bobbin Thread</p>
          <p className="text-2xl font-bold text-amber-900">{metrics.bobbin_thread_meters} m</p>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Commercial Cost Breakdown</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Base Setup Fee</span>
            <span className="font-medium text-gray-900">₹{metrics.pricing_breakdown.base_setup_fee}</span>
          </div>
          <div className="flex justify-between">
            <span>Stitch Fee (₹45 / 1k)</span>
            <span className="font-medium text-gray-900">₹{metrics.pricing_breakdown.stitch_fee}</span>
          </div>
          <div className="flex justify-between">
            <span>Thread Cost</span>
            <span className="font-medium text-gray-900">₹{metrics.pricing_breakdown.thread_material_cost}</span>
          </div>
          <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100 mt-2">
            <span>Total Estimated Price</span>
            <span className="text-blue-600">₹{metrics.pricing_breakdown.total_estimated_price}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
