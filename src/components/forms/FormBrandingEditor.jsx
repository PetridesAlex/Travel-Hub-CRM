import { ImageIcon, Palette, Upload } from 'lucide-react'
import Input from '../ui/Input'
import { resolveAgencyLogoUrl } from '../../utils/resolveAgencyLogo'

const PRESET_COLORS = ['#b71c1c', '#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#e65100', '#37474f']

export default function FormBrandingEditor({ form, agency, onChange }) {
  const settings = form.settings || {}
  const logoUrl = resolveAgencyLogoUrl(agency)

  const updateSettings = (patch) => onChange({ settings: { ...settings, ...patch } })

  const handleHeroUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateSettings({ hero_image_url: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Form branding</h3>
        <p className="mt-1 text-xs text-slate-500">Google Forms-style header with your logo or a hero banner image.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Brand accent color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => updateSettings({ brand_color: color })}
                className={`h-9 w-9 rounded-full border-2 shadow-sm transition ${
                  settings.brand_color === color ? 'border-slate-900 scale-110' : 'border-white'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-400" />
            <input
              type="color"
              value={settings.brand_color || '#b71c1c'}
              onChange={(e) => updateSettings({ brand_color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-slate-200"
            />
            <span className="text-xs text-slate-500">{settings.brand_color || '#b71c1c'}</span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Hero banner image</label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 transition hover:border-teal-300 hover:bg-teal-50/30">
            <Upload className="mb-2 h-6 w-6 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Upload banner</span>
            <span className="mt-1 text-xs text-slate-400">Recommended 1200×400px</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
          </label>
          {settings.hero_image_url && (
            <img src={settings.hero_image_url} alt="" className="mt-3 h-24 w-full rounded-lg object-cover" />
          )}
        </div>
      </div>

      <Input
        label="Or hero image URL"
        value={settings.hero_image_url?.startsWith('data:') ? '' : (settings.hero_image_url || '')}
        onChange={(e) => updateSettings({ hero_image_url: e.target.value || null })}
        placeholder="https://..."
      />

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={settings.use_agency_logo !== false}
          onChange={(e) => updateSettings({ use_agency_logo: e.target.checked })}
          className="rounded text-teal-600"
        />
        Show agency logo in header
        {logoUrl && <img src={logoUrl} alt="" className="ml-2 h-6 object-contain" />}
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <ImageIcon className="h-4 w-4" />
          Question images
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Add an image per question in the Builder tab — paste a URL or upload, like hotel photos in your survey.
        </p>
      </div>
    </div>
  )
}