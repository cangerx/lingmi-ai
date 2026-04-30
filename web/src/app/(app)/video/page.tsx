"use client";

import { Video, Upload, Type, Image } from "lucide-react";

const modes = [
  { name: "文字生成视频", desc: "输入文字描述，AI 生成对应短视频", icon: Type, color: "bg-red-50 text-red-600" },
  { name: "图片生成视频", desc: "上传静态图片，让它动起来", icon: Image, color: "bg-orange-50 text-orange-600" },
];

export default function VideoPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
          <Video size={20} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">AI 视频</h1>
          <p className="text-sm text-neutral-500">图片或文字生成短视频</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.name}
              className="flex flex-col items-center gap-3 p-8 rounded-xl bg-white border border-neutral-200/60 hover:border-neutral-300 hover:shadow-sm transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${mode.color}`}>
                <Icon size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-neutral-900 mb-1">{mode.name}</h3>
                <p className="text-xs text-neutral-500">{mode.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/60 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">描述词</label>
          <textarea
            rows={3}
            placeholder="描述你想生成的视频场景..."
            className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none focus:border-neutral-300 focus:shadow-sm resize-none transition-colors"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">时长</label>
            <select className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none">
              <option>4 秒</option>
              <option>8 秒</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">比例</label>
            <select className="w-full px-3 py-2 rounded-lg border border-neutral-200/60 text-sm outline-none">
              <option>16:9</option>
              <option>9:16</option>
              <option>1:1</option>
            </select>
          </div>
        </div>
        <button className="w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
          生成视频
        </button>
      </div>
    </div>
  );
}
