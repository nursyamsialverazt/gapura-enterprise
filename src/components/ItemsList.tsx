import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Package,
  Sparkles,
  Settings2,
  Edit3,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { InvoiceItem } from '../types';
import { formatRupiah, formatNumberOnly } from '../utils/formatters';

interface ItemsListProps {
  items: InvoiceItem[];
  downPayment: number;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, updates: Partial<InvoiceItem>) => void;
  onUpdateDP: (amount: number) => void;
}

export interface PresetItem {
  id: string;
  name: string;
  price: number;
  label?: string;
}

const DEFAULT_PRESETS: PresetItem[] = [
  { id: '1', name: 'Panggung Hiburan 6x4', price: 1200000, label: 'Panggung Hiburan 6x4' },
  { id: '2', name: 'Panggung Pelaminan 2x6', price: 750000, label: 'Panggung Pelaminan 2x6' },
  { id: '3', name: 'Panggung Pelaminan 3x6', price: 1000000, label: 'Panggung Pelaminan 3x6' },
  { id: '4', name: 'Set Parasmanan', price: 750000, label: 'Set Parasmanan' },
  { id: '5', name: 'Tenda VIP Plafon Serut + Karpet (10 x 15 m)', price: 4500000, label: 'Tenda VIP 10x15' },
  { id: '6', name: 'Pelaminan Modern Rustic 8 Meter + Mini Garden', price: 7500000, label: 'Pelaminan 8m' },
  { id: '7', name: 'Kursi Futura + Cover & Pita', price: 15000, label: 'Kursi Futura' },
  { id: '8', name: 'Sound System 5000W + Singer & Organ Tunggal', price: 3500000, label: 'Sound 5000W' },
  { id: '9', name: 'Lighting Stage & Follow Spot', price: 1500000, label: 'Lighting Stage' },
  { id: '10', name: 'Dokumentasi Foto & Video Cinematic', price: 3000000, label: 'Foto & Video' },
];

const PRESET_STORAGE_KEY = 'gapura_item_presets_v2';

export const ItemsList: React.FC<ItemsListProps> = ({
  items,
  downPayment,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onUpdateDP,
}) => {
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem(PRESET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Error loading custom presets from storage', e);
    }
    return DEFAULT_PRESETS;
  });

  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetPrice, setNewPresetPrice] = useState<number>(0);

  const savePresetsToStorage = (updated: PresetItem[]) => {
    setPresets(updated);
    try {
      localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving presets to storage', e);
    }
  };

  const totalGross = items.reduce((sum, item) => sum + (item.quantity * item.price || 0), 0);
  const remaining = totalGross - downPayment;

  const handleApplyPreset = (preset: PresetItem) => {
    // Check if the last item is empty, if so fill it; otherwise add new
    const lastItem = items[items.length - 1];
    if (lastItem && !lastItem.name && lastItem.price === 0) {
      onUpdateItem(items.length - 1, {
        name: preset.name,
        quantity: 1,
        price: preset.price,
      });
    } else {
      onAddItem();
      setTimeout(() => {
        onUpdateItem(items.length, {
          name: preset.name,
          quantity: 1,
          price: preset.price,
        });
      }, 0);
    }
  };

  const handleStartEditPreset = (preset: PresetItem) => {
    setEditingPresetId(preset.id);
    setEditName(preset.name);
    setEditPrice(preset.price);
  };

  const handleSaveEditPreset = (id: string) => {
    if (!editName.trim()) return;
    const updated = presets.map((p) =>
      p.id === id
        ? {
            ...p,
            name: editName.trim(),
            label: editName.trim(),
            price: editPrice >= 0 ? editPrice : 0,
          }
        : p
    );
    savePresetsToStorage(updated);
    setEditingPresetId(null);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    savePresetsToStorage(updated);
    if (editingPresetId === id) setEditingPresetId(null);
  };

  const handleAddNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    const newPreset: PresetItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newPresetName.trim(),
      label: newPresetName.trim(),
      price: newPresetPrice >= 0 ? newPresetPrice : 0,
    };
    const updated = [newPreset, ...presets];
    savePresetsToStorage(updated);
    setNewPresetName('');
    setNewPresetPrice(0);
  };

  const handleResetPresetsToDefault = () => {
    if (window.confirm('Kembalikan seluruh daftar preset ke bawaan standar pabrik?')) {
      savePresetsToStorage(DEFAULT_PRESETS);
      setEditingPresetId(null);
    }
  };

  const handleQuickDPPercentage = (pct: number) => {
    const calculatedDP = Math.round((totalGross * pct) / 100);
    onUpdateDP(calculatedDP);
  };

  return (
    <div id="items-list-card" className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#8B0000]" />
          <h3 className="text-xs font-bold tracking-wider text-[#8B0000] uppercase">
            Item Barang / Jasa Sewa
          </h3>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {items.length} Baris
        </span>
      </div>

      {/* Quick Presets Picker with Edit/Manage Button */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Preset Cepat (Klik untuk tambah & edit):</span>
          </div>
          <button
            id="btn-toggle-edit-presets"
            type="button"
            onClick={() => setShowPresetManager(!showPresetManager)}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 cursor-pointer ${
              showPresetManager
                ? 'bg-[#8B0000] text-white border-[#8B0000]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Kelola, ubah nama, harga, atau tambah preset kustom Anda sendiri"
          >
            <Settings2 className="w-3 h-3" />
            <span>{showPresetManager ? 'Tutup Pengaturan Preset' : 'Kelola / Edit Preset'}</span>
          </button>
        </div>

        {/* Horizontal Quick Presets List */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {presets.map((preset) => (
            <button
              id={`preset-btn-${preset.id}`}
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="text-[11px] whitespace-nowrap bg-slate-50 hover:bg-red-50 hover:text-[#8B0000] hover:border-red-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-full transition shrink-0 cursor-pointer font-medium active:scale-95 shadow-2xs"
              title={`Klik untuk masukkan ${preset.name} - ${formatRupiah(preset.price)}`}
            >
              + {preset.label || preset.name}
            </button>
          ))}
        </div>

        {/* Inline Drawer: Kelola & Edit Preset Cepat */}
        {showPresetManager && (
          <div className="mt-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#8B0000]" />
                Kelola Daftar Preset Cepat
              </span>
              <button
                type="button"
                onClick={handleResetPresetsToDefault}
                className="text-[10px] text-slate-500 hover:text-red-700 flex items-center gap-1 transition"
                title="Kembalikan semua preset ke pengaturan awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ke Standar</span>
              </button>
            </div>

            {/* Form Tambah Preset Baru */}
            <form onSubmit={handleAddNewPreset} className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="text-[10px] font-bold text-slate-600 block uppercase">
                + Tambah Preset Baru
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Nama item (cth: Panggung Pelaminan 4x8)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="sm:col-span-6 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#8B0000]"
                />
                <div className="sm:col-span-4 relative">
                  <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">Rp</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Harga default (0)"
                    value={newPresetPrice === 0 ? '' : newPresetPrice}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setNewPresetPrice(isNaN(v) ? 0 : v);
                    }}
                    className="w-full text-xs pl-8 pr-2 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#8B0000] font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="sm:col-span-2 px-3 py-1.5 bg-[#8B0000] hover:bg-[#700000] text-white text-xs font-bold rounded-md transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-[#bef264]" />
                  <span>Simpan</span>
                </button>
              </div>
            </form>

            {/* List of Existing Presets with Edit & Delete */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Daftar Preset Tersimpan ({presets.length} item):
              </span>
              {presets.map((preset) => {
                const isEditing = editingPresetId === preset.id;

                if (isEditing) {
                  return (
                    <div
                      key={preset.id}
                      className="p-2 bg-amber-50/70 border border-amber-300 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-xs"
                    >
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-white border border-amber-300 rounded text-xs focus:outline-none"
                      />
                      <div className="relative w-full sm:w-32">
                        <span className="absolute left-2 top-1 text-xs text-slate-400">Rp</span>
                        <input
                          type="number"
                          min="0"
                          value={editPrice === 0 ? '' : editPrice}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            setEditPrice(isNaN(v) ? 0 : v);
                          }}
                          className="w-full pl-7 pr-1.5 py-1 bg-white border border-amber-300 rounded text-xs font-mono"
                        />
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveEditPreset(preset.id)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                          title="Simpan Perubahan"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingPresetId(null)}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
                          title="Batal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {preset.price > 0 ? formatRupiah(preset.price) : 'Rp 0'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditPreset(preset)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit nama atau harga"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Hapus preset ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Item Rows */}
      <div className="space-y-3 mb-4">
        {items.map((item, index) => {
          const rowTotal = (item.quantity || 0) * (item.price || 0);

          return (
            <div
              key={item.id || index}
              id={`item-row-${index}`}
              className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#8B0000] text-white text-[11px] font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-xs font-medium text-slate-600">
                    Item #{index + 1}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Subtotal: <span className="text-[#8B0000]">{formatRupiah(rowTotal)}</span>
                  </span>
                  {items.length > 1 && (
                    <button
                      id={`delete-item-${index}-btn`}
                      type="button"
                      onClick={() => onRemoveItem(index)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      title="Hapus baris"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <input
                  id={`item-name-${index}-input`}
                  type="text"
                  value={item.name}
                  onChange={(e) => onUpdateItem(index, { name: e.target.value })}
                  placeholder="Nama Barang / Jasa (misal: Panggung Pelaminan 3x6, Set Parasmanan)"
                  className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000] outline-none font-medium"
                />

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-medium mb-0.5">
                      Jumlah (Qty)
                    </label>
                    <input
                      id={`item-qty-${index}-input`}
                      type="number"
                      min="0"
                      value={item.quantity === 0 ? '' : item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        onUpdateItem(index, { quantity: isNaN(val) ? 0 : val });
                      }}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-[#8B0000] outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 uppercase font-medium mb-0.5">
                      Harga Satuan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-medium">
                        Rp
                      </span>
                      <input
                        id={`item-price-${index}-input`}
                        type="number"
                        min="0"
                        value={item.price === 0 ? '' : item.price}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateItem(index, { price: isNaN(val) ? 0 : val });
                        }}
                        placeholder="0"
                        className="w-full pl-8 pr-2.5 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-[#8B0000] outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Row Button */}
      <button
        id="add-item-row-btn"
        type="button"
        onClick={onAddItem}
        className="w-full py-2 px-3 border border-dashed border-[#8B0000] text-[#8B0000] hover:bg-red-50/50 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99] mb-4 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        TAMBAH BARIS ITEM
      </button>

      {/* Down Payment (DP) Section */}
      <div className="pt-3 border-t border-slate-200">
        <label htmlFor="down-payment-input" className="block text-xs font-semibold text-slate-700 mb-1">
          Uang Muka / DP (Rp)
        </label>
        <div className="relative mb-2">
          <span className="absolute left-3 top-2 text-sm text-slate-400 font-medium">
            Rp
          </span>
          <input
            id="down-payment-input"
            type="number"
            min="0"
            value={downPayment === 0 ? '' : downPayment}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onUpdateDP(isNaN(val) ? 0 : val);
            }}
            placeholder="0"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#8B0000] outline-none font-mono font-medium"
          />
        </div>

        {/* Quick DP % buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-500 font-medium">Quick DP:</span>
          {[10, 20, 30, 50, 100].map((pct) => (
            <button
              id={`quick-dp-${pct}-btn`}
              key={pct}
              type="button"
              onClick={() => handleQuickDPPercentage(pct)}
              className="text-[10px] font-medium bg-slate-100 hover:bg-red-50 hover:text-[#8B0000] text-slate-700 px-2 py-0.5 rounded transition cursor-pointer"
            >
              {pct === 100 ? 'Lunas (100%)' : `${pct}%`}
            </button>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="mt-3 p-3 bg-red-50/50 rounded-lg border border-red-100 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-700">
            <span>Total Kotor (Gross):</span>
            <span className="font-semibold text-slate-900">{formatRupiah(totalGross)}</span>
          </div>
          <div className="flex justify-between text-slate-700">
            <span>Uang Muka (DP):</span>
            <span className="font-semibold text-emerald-700">{formatRupiah(downPayment)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-red-200/60 pt-1 text-slate-900">
            <span>Sisa Tagihan:</span>
            <span className={remaining > 0 ? 'text-red-700' : 'text-emerald-700'}>
              {formatRupiah(remaining)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
