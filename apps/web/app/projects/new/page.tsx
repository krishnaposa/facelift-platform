'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type UpgradeKey =
  | 'frontDoor'
  | 'bidets'
  | 'cabinetRefacing'
  | 'spindles'
  | 'airVents'
  | 'countertops';

type ProjectSelections = {
  title: string;
  zipCode: string;
  notes: string;
  photos: string[];
  items: {
    frontDoor?: {
      selected: boolean;
      type?: 'single' | 'double' | 'double_sidelights';
    };
    bidets?: {
      selected: boolean;
      count?: number;
    };
    cabinetRefacing?: {
      selected: boolean;
      finish?: 'painted' | 'stained' | 'laminate';
    };
    spindles?: {
      selected: boolean;
      material?: 'wood' | 'iron' | 'steel';
    };
    airVents?: {
      selected: boolean;
      style?: 'modern_white' | 'black_metal' | 'wood_flush';
    };
    countertops?: {
      selected: boolean;
      material?: 'quartz' | 'granite' | 'marble' | 'laminate';
    };
  };
};

const initialState: ProjectSelections = {
  title: '',
  zipCode: '',
  notes: '',
  photos: [''],
  items: {},
};

export default function NewProjectPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProjectSelections>(initialState);

  const selectedCount = useMemo(() => {
    return Object.values(form.items).filter((item) => item?.selected).length;
  }, [form.items]);

  function toggleItem(key: UpgradeKey) {
    setForm((prev) => {
      const existing = prev.items[key];
      const nextSelected = !existing?.selected;

      return {
        ...prev,
        items: {
          ...prev.items,
          [key]: {
            ...existing,
            selected: nextSelected,
          },
        },
      };
    });
  }

  function updateItem<K extends UpgradeKey>(
    key: K,
    patch: NonNullable<ProjectSelections['items'][K]>
  ) {
    setForm((prev) => ({
      ...prev,
      items: {
        ...prev.items,
        [key]: {
          ...(prev.items[key] || { selected: true }),
          ...patch,
        },
      },
    }));
  }

  function updatePhoto(index: number, value: string) {
    setForm((prev) => {
      const nextPhotos = [...prev.photos];
      nextPhotos[index] = value;
      return { ...prev, photos: nextPhotos };
    });
  }

  function addPhotoField() {
    setForm((prev) => ({
      ...prev,
      photos: [...prev.photos, ''],
    }));
  }

  function removePhotoField(index: number) {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }

  function validateStep(currentStep: number) {
    if (currentStep === 1 && selectedCount === 0) {
      setError('Select at least one upgrade item.');
      return false;
    }

    if (currentStep === 3) {
      if (!form.title.trim()) {
        setError('Enter a project title.');
        return false;
      }

      if (!form.zipCode.trim()) {
        setError('Enter a zip code.');
        return false;
      }
    }

    setError('');
    return true;
  }

  function nextStep() {
    if (!validateStep(step)) return;
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function prevStep() {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(3)) return;

    try {
      setSubmitting(true);
      setError('');

      const cleanedPhotos = form.photos.map((p) => p.trim()).filter(Boolean);

      const payload = {
        title: form.title.trim(),
        zipCode: form.zipCode.trim(),
        selections: {
          ...form,
          photos: cleanedPhotos,
        },
      };

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('project create failed status:', res.status);
        console.error('project create failed raw response:', text);
        throw new Error(text || 'Failed to create project.');
      }

      const data = await res.json();
      console.log('API response data:', data);

      if (!data?.project?.id) {
        throw new Error('Project created, but no project id was returned.');
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Homeowner Project Wizard
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-900">
            Create your facelift project
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Select the upgrades you want, add preferences, attach photo links for
            now, and open the project for contractor bids.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                step === n
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-500 ring-1 ring-slate-200'
              }`}
            >
              Step {n}
            </div>
          ))}
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {step === 1 && (
            <StepOne
              form={form}
              toggleItem={toggleItem}
              selectedCount={selectedCount}
            />
          )}

          {step === 2 && <StepTwo form={form} updateItem={updateItem} />}

          {step === 3 && (
            <StepThree
              form={form}
              setForm={setForm}
              updatePhoto={updatePhoto}
              addPhotoField={addPhotoField}
              removePhotoField={removePhotoField}
            />
          )}

          {step === 4 && <StepFour form={form} />}

          {error ? (
            <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={step === 1 || submitting}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>

            {step < 4 ? (
              <button
                onClick={nextStep}
                disabled={submitting}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepOne({
  form,
  toggleItem,
  selectedCount,
}: {
  form: ProjectSelections;
  toggleItem: (key: UpgradeKey) => void;
  selectedCount: number;
}) {
  const items: { key: UpgradeKey; title: string; desc: string }[] = [
    {
      key: 'frontDoor',
      title: 'Front Door',
      desc: 'Single, double, or double with sidelights',
    },
    {
      key: 'bidets',
      title: 'Bidets',
      desc: 'Add bidets to one or more bathrooms',
    },
    {
      key: 'cabinetRefacing',
      title: 'Cabinet Refacing',
      desc: 'Refresh kitchen or bathroom cabinetry',
    },
    {
      key: 'spindles',
      title: 'Spindles and Railings',
      desc: 'Replace staircase spindles or update railing style',
    },
    {
      key: 'airVents',
      title: 'Air Vents',
      desc: 'Swap vent covers and returns for a cleaner aesthetic',
    },
    {
      key: 'countertops',
      title: 'Countertops',
      desc: 'Quartz, granite, marble, or laminate refresh',
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">
        Choose upgrade items
      </h2>
      <p className="mt-2 text-slate-600">
        Select everything you want contractors to bid on.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const selected = !!form.items[item.key]?.selected;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => toggleItem(item.key)}
              className={`rounded-[24px] p-5 text-left transition ${
                selected
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-900 ring-1 ring-slate-200'
              }`}
            >
              <div className="text-lg font-semibold">{item.title}</div>
              <div
                className={`mt-2 text-sm ${
                  selected ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {item.desc}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-sm font-medium text-slate-500">
        {selectedCount} item{selectedCount === 1 ? '' : 's'} selected
      </div>
    </div>
  );
}

function StepTwo({
  form,
  updateItem,
}: {
  form: ProjectSelections;
  updateItem: <K extends UpgradeKey>(
    key: K,
    patch: NonNullable<ProjectSelections['items'][K]>
  ) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">
        Configure your selections
      </h2>
      <p className="mt-2 text-slate-600">
        Add simple preferences now. You can collect more detail later.
      </p>

      <div className="mt-6 space-y-6">
        {form.items.frontDoor?.selected && (
          <Card title="Front Door">
            <SelectRow
              label="Door type"
              value={form.items.frontDoor.type || ''}
              onChange={(value) =>
                updateItem('frontDoor', {
                  selected: true,
                  type: value as 'single' | 'double' | 'double_sidelights',
                })
              }
              options={[
                { label: 'Single', value: 'single' },
                { label: 'Double', value: 'double' },
                { label: 'Double + sidelights', value: 'double_sidelights' },
              ]}
            />
          </Card>
        )}

        {form.items.bidets?.selected && (
          <Card title="Bidets">
            <InputRow
              label="How many toilets"
              type="number"
              min={1}
              value={form.items.bidets.count ?? ''}
              onChange={(value) =>
                updateItem('bidets', {
                  selected: true,
                  count: Number(value),
                })
              }
            />
          </Card>
        )}

        {form.items.cabinetRefacing?.selected && (
          <Card title="Cabinet Refacing">
            <SelectRow
              label="Preferred finish"
              value={form.items.cabinetRefacing.finish || ''}
              onChange={(value) =>
                updateItem('cabinetRefacing', {
                  selected: true,
                  finish: value as 'painted' | 'stained' | 'laminate',
                })
              }
              options={[
                { label: 'Painted', value: 'painted' },
                { label: 'Stained', value: 'stained' },
                { label: 'Laminate', value: 'laminate' },
              ]}
            />
          </Card>
        )}

        {form.items.spindles?.selected && (
          <Card title="Spindles and Railings">
            <SelectRow
              label="Preferred material"
              value={form.items.spindles.material || ''}
              onChange={(value) =>
                updateItem('spindles', {
                  selected: true,
                  material: value as 'wood' | 'iron' | 'steel',
                })
              }
              options={[
                { label: 'Wood', value: 'wood' },
                { label: 'Iron', value: 'iron' },
                { label: 'Steel', value: 'steel' },
              ]}
            />
          </Card>
        )}

        {form.items.airVents?.selected && (
          <Card title="Air Vents">
            <SelectRow
              label="Preferred style"
              value={form.items.airVents.style || ''}
              onChange={(value) =>
                updateItem('airVents', {
                  selected: true,
                  style: value as 'modern_white' | 'black_metal' | 'wood_flush',
                })
              }
              options={[
                { label: 'Modern White', value: 'modern_white' },
                { label: 'Black Metal', value: 'black_metal' },
                { label: 'Wood Flush', value: 'wood_flush' },
              ]}
            />
          </Card>
        )}

        {form.items.countertops?.selected && (
          <Card title="Countertops">
            <SelectRow
              label="Preferred material"
              value={form.items.countertops.material || ''}
              onChange={(value) =>
                updateItem('countertops', {
                  selected: true,
                  material: value as 'quartz' | 'granite' | 'marble' | 'laminate',
                })
              }
              options={[
                { label: 'Quartz', value: 'quartz' },
                { label: 'Granite', value: 'granite' },
                { label: 'Marble', value: 'marble' },
                { label: 'Laminate', value: 'laminate' },
              ]}
            />
          </Card>
        )}
      </div>
    </div>
  );
}

function StepThree({
  form,
  setForm,
  updatePhoto,
  addPhotoField,
  removePhotoField,
}: {
  form: ProjectSelections;
  setForm: React.Dispatch<React.SetStateAction<ProjectSelections>>;
  updatePhoto: (index: number, value: string) => void;
  addPhotoField: () => void;
  removePhotoField: (index: number) => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">
        Project details and photos
      </h2>
      <p className="mt-2 text-slate-600">
        Add a project title, location, notes, and image URLs for now.
      </p>

      <div className="mt-6 space-y-5">
        <InputRow
          label="Project Title"
          value={form.title}
          onChange={(value) => setForm((prev) => ({ ...prev, title: value }))}
        />

        <InputRow
          label="Zip Code"
          value={form.zipCode}
          onChange={(value) => setForm((prev) => ({ ...prev, zipCode: value }))}
        />

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Project Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            rows={5}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-900"
            placeholder="Describe the look you want, timing preferences, budget thoughts, and anything the contractor should know."
          />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-700">
            Photo Links
          </div>
          <div className="space-y-3">
            {form.photos.map((photo, index) => (
              <div key={index} className="flex gap-3">
                <input
                  value={photo}
                  onChange={(e) => updatePhoto(index, e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
                />
                {form.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePhotoField(index)}
                    className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addPhotoField}
            className="mt-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900"
          >
            Add another photo link
          </button>
        </div>
      </div>
    </div>
  );
}

function StepFour({ form }: { form: ProjectSelections }) {
  const selectedItems = Object.entries(form.items).filter(
    ([, value]) => value?.selected
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">
        Review and submit
      </h2>
      <p className="mt-2 text-slate-600">Make sure everything looks right.</p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Selected Items
          </div>
          <div className="mt-4 space-y-3">
            {selectedItems.map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
              >
                <div className="font-semibold text-slate-900">
                  {prettyLabel(key)}
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-500">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Project Info
          </div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div>
              <span className="font-semibold">Title:</span>{' '}
              {form.title || 'Not provided'}
            </div>
            <div>
              <span className="font-semibold">Zip Code:</span>{' '}
              {form.zipCode || 'Not provided'}
            </div>
            <div>
              <span className="font-semibold">Notes:</span>{' '}
              {form.notes || 'None'}
            </div>
            <div>
              <span className="font-semibold">Photo Links:</span>{' '}
              {form.photos.filter(Boolean).length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-5 ring-1 ring-slate-200">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  type = 'text',
  min,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
      />
    </div>
  );
}

function SelectRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900"
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function prettyLabel(key: string) {
  const map: Record<string, string> = {
    frontDoor: 'Front Door',
    bidets: 'Bidets',
    cabinetRefacing: 'Cabinet Refacing',
    spindles: 'Spindles and Railings',
    airVents: 'Air Vents',
    countertops: 'Countertops',
  };

  return map[key] || key;
}