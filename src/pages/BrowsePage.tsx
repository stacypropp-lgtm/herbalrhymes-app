import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import herbsData from '../data/herbs.json';
import formulasData from '../data/formulas.json';
import acupointsData from '../data/acupoints.json';
import pointCategoriesData from '../data/point-categories.json';
import type { Herb, Formula, Acupoint } from '../types/index.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = 'all' | 'herbs' | 'formulas' | 'acupoints';

type DetailItem =
  | { kind: 'herb'; data: Herb }
  | { kind: 'formula'; data: Formula }
  | { kind: 'acupoint'; data: Acupoint };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ALL_CHANNELS = Array.from(
  new Set([
    ...(herbsData as Herb[]).flatMap((h) => h.channels),
    ...(acupointsData as Acupoint[]).map((a) => a.channel),
  ]),
).sort();

const HERB_CATEGORIES = Array.from(
  new Set((herbsData as Herb[]).map((h) => h.category)),
);

const HERB_TEMPS = Array.from(
  new Set((herbsData as Herb[]).map((h) => h.temperature)),
).sort();

const ACUPOINT_CHANNELS = Array.from(
  new Set((acupointsData as Acupoint[]).map((a) => a.channel)),
).sort();

const ACUPOINT_SPECIAL_CATS = Array.from(
  new Set((acupointsData as Acupoint[]).flatMap((a) => a.specialCategories)),
).sort();

const ACUPOINT_ELEMENTS = Array.from(
  new Set(
    (acupointsData as Acupoint[])
      .map((a) => a.element)
      .filter(Boolean) as string[],
  ),
).sort();

/** Simple fuzzy-ish matching — lowercase includes */
function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  // support multiple terms separated by space
  return q.split(/\s+/).every((term) => lower.includes(term));
}

function matchHerb(h: Herb, q: string): boolean {
  return (
    fuzzyMatch(h.pinyin, q) ||
    fuzzyMatch(h.latin, q) ||
    fuzzyMatch(h.category, q) ||
    fuzzyMatch(h.indications, q) ||
    h.channels.some((c) => fuzzyMatch(c, q))
  );
}

function matchFormula(f: Formula, q: string): boolean {
  return (
    fuzzyMatch(f.pinyin, q) ||
    fuzzyMatch(f.english_name, q) ||
    fuzzyMatch(f.category, q) ||
    fuzzyMatch(f.indications, q) ||
    f.actions.some((a) => fuzzyMatch(a, q))
  );
}

function matchAcupoint(a: Acupoint, q: string): boolean {
  return (
    fuzzyMatch(a.name, q) ||
    fuzzyMatch(a.number, q) ||
    fuzzyMatch(a.english, q) ||
    fuzzyMatch(a.channel, q) ||
    fuzzyMatch(a.channelName, q) ||
    a.indications.some((i) => fuzzyMatch(i, q)) ||
    a.categories.some((c) => fuzzyMatch(c, q))
  );
}

/** Pretty-print a snake_case / underscore key as a title */
function keyToTitle(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ChipToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
        active
          ? 'bg-forest text-cream border-forest dark:bg-gold dark:text-charcoal dark:border-gold'
          : 'bg-cream dark:bg-charcoal border-charcoal/20 dark:border-cream/20 text-charcoal dark:text-cream hover:bg-forest/10 dark:hover:bg-gold/10'
      }`}
    >
      {label}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] uppercase tracking-wider text-charcoal/50 dark:text-cream/50 font-semibold">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail panels
// ---------------------------------------------------------------------------

function HerbDetail({ herb }: { herb: Herb }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold">
          {herb.pinyin}
        </h2>
        <p className="text-sm text-charcoal/60 dark:text-cream/60 italic">
          {herb.latin}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Category" value={herb.category} />
        <InfoCard label="Temperature" value={herb.temperature} />
        <InfoCard label="Taste" value={herb.taste} />
        <InfoCard
          label="Channels"
          value={herb.channels.join(', ')}
        />
      </div>

      <DetailSection label="Indications">{herb.indications}</DetailSection>

      {herb.contraindication && (
        <DetailSection label="Contraindications">
          <span className="text-red-600 dark:text-red-400">
            {herb.contraindication}
          </span>
        </DetailSection>
      )}

      {herb.boardPearl && (
        <div className="bg-gold/10 dark:bg-gold/20 border border-gold/30 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gold mb-1">
            Board Pearl
          </p>
          <p className="text-sm leading-relaxed">{herb.boardPearl}</p>
        </div>
      )}
    </div>
  );
}

function FormulaDetail({ formula }: { formula: Formula }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold">
          {formula.pinyin}
        </h2>
        <p className="text-sm text-charcoal/60 dark:text-cream/60 italic">
          {formula.english_name}
        </p>
        <p className="text-xs mt-1 px-2 py-0.5 inline-block rounded-full bg-forest/10 dark:bg-gold/10 text-forest dark:text-gold">
          {formula.category}
        </p>
      </div>

      {/* Composition table */}
      {formula.composition.length > 0 && (
        <div>
          <SectionLabel>Composition</SectionLabel>
          <div className="mt-1 rounded-xl overflow-hidden border border-charcoal/10 dark:border-cream/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-forest/10 dark:bg-gold/10 text-left">
                  <th className="px-3 py-2 font-semibold">Herb</th>
                  <th className="px-3 py-2 font-semibold">Role</th>
                  <th className="px-3 py-2 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {formula.composition.map((c, i) => (
                  <tr
                    key={i}
                    className="border-t border-charcoal/5 dark:border-cream/5"
                  >
                    <td className="px-3 py-2">{c.herb}</td>
                    <td className="px-3 py-2 font-medium text-forest dark:text-gold">
                      {c.role}
                    </td>
                    <td className="px-3 py-2">{c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {formula.actions.length > 0 && (
        <DetailSection label="Actions">
          <ul className="list-disc list-inside space-y-1">
            {formula.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      <DetailSection label="Indications">{formula.indications}</DetailSection>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Tongue" value={formula.tongue} />
        <InfoCard label="Pulse" value={formula.pulse} />
      </div>

      {formula.mnemonic && (
        <DetailSection label="Mnemonic">
          <p className="italic">{formula.mnemonic}</p>
        </DetailSection>
      )}

      {formula.board_pearl && (
        <div className="bg-gold/10 dark:bg-gold/20 border border-gold/30 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gold mb-1">
            Board Pearl
          </p>
          <p className="text-sm leading-relaxed">{formula.board_pearl}</p>
        </div>
      )}

      {formula.formula_math && (
        <DetailSection label="Formula Math">
          <p className="text-sm font-mono bg-charcoal/5 dark:bg-cream/5 p-3 rounded-lg">
            {formula.formula_math}
          </p>
        </DetailSection>
      )}

      {formula.key_modifications.length > 0 && (
        <div>
          <SectionLabel>Key Modifications</SectionLabel>
          <div className="mt-1 space-y-2">
            {formula.key_modifications.map((m, i) => (
              <div
                key={i}
                className="text-sm bg-charcoal/5 dark:bg-cream/5 rounded-lg p-3"
              >
                <span className="font-semibold">{m.modification}</span>
                <span className="text-charcoal/60 dark:text-cream/60"> — {m.for}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {formula.comparison_formulas.length > 0 && (
        <DetailSection label="Comparison Formulas">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {formula.comparison_formulas.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      {formula.clinical_pearls.length > 0 && (
        <DetailSection label="Clinical Pearls">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {formula.clinical_pearls.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      {formula.contraindications.length > 0 && (
        <DetailSection label="Contraindications">
          <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
            {formula.contraindications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </DetailSection>
      )}
    </div>
  );
}

function AcupointDetail({ point }: { point: Acupoint }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-forest dark:text-gold">
          {point.number} &mdash; {point.name}
        </h2>
        <p className="text-sm text-charcoal/60 dark:text-cream/60 italic">
          {point.english}
        </p>
        <p className="text-xs mt-1 text-charcoal/50 dark:text-cream/50">
          {point.channelName}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {point.element && <InfoCard label="Element" value={point.element} />}
        {point.yinYang && <InfoCard label="Yin/Yang" value={point.yinYang} />}
        {point.fiveShu && <InfoCard label="Five Shu" value={point.fiveShu} />}
        <InfoCard label="Depth" value={point.depth} />
      </div>

      <DetailSection label="Location">
        <p className="text-sm">{point.location}</p>
      </DetailSection>

      {point.categories.length > 0 && (
        <div>
          <SectionLabel>Categories</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {point.categories.map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-forest/10 dark:bg-gold/10 text-forest dark:text-gold"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {point.specialCategories.length > 0 && (
        <div>
          <SectionLabel>Special Categories</SectionLabel>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {point.specialCategories.map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-gold/20 dark:bg-gold/30 text-gold"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {point.indications.length > 0 && (
        <DetailSection label="Indications">
          <ul className="list-disc list-inside space-y-1 text-sm">
            {point.indications.map((ind, i) => (
              <li key={i}>{ind}</li>
            ))}
          </ul>
        </DetailSection>
      )}

      {point.cautions && (
        <DetailSection label="Cautions">
          <span className="text-red-600 dark:text-red-400 text-sm">
            {point.cautions}
          </span>
        </DetailSection>
      )}

      {point.boardPearl && (
        <div className="bg-gold/10 dark:bg-gold/20 border border-gold/30 rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gold mb-1">
            Board Pearl
          </p>
          <p className="text-sm leading-relaxed">{point.boardPearl}</p>
        </div>
      )}

      {point.memoryTrick && (
        <DetailSection label="Memory Trick">
          <p className="text-sm italic">{point.memoryTrick}</p>
        </DetailSection>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-charcoal/5 dark:bg-cream/5 rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-wider text-charcoal/50 dark:text-cream/50 font-semibold mb-0.5">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail overlay (full-screen slide-up)
// ---------------------------------------------------------------------------

function DetailOverlay({
  item,
  onClose,
}: {
  item: DetailItem | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (item) {
      // small delay to trigger the CSS transition
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [item]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* panel */}
      <div
        className={`relative mt-12 flex-1 bg-cream dark:bg-charcoal rounded-t-2xl shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* drag handle */}
        <div className="sticky top-0 z-10 bg-cream dark:bg-charcoal pt-3 pb-2 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-charcoal/20 dark:bg-cream/20" />
        </div>

        {/* close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-4 p-1.5 rounded-full hover:bg-charcoal/10 dark:hover:bg-cream/10 transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <div className="px-5 pb-10">
          {item.kind === 'herb' && <HerbDetail herb={item.data} />}
          {item.kind === 'formula' && <FormulaDetail formula={item.data} />}
          {item.kind === 'acupoint' && <AcupointDetail point={item.data} />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick reference tables for point categories
// ---------------------------------------------------------------------------

function PointCategoryReference() {
  const categories = (pointCategoriesData as any).point_categories;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const categoryKeys = Object.keys(categories).filter(
    (k) => k !== 'description',
  );

  return (
    <div className="mt-6 space-y-3">
      <h3 className="font-heading text-lg font-bold text-forest dark:text-gold">
        Quick Reference Tables
      </h3>
      <p className="text-xs text-charcoal/50 dark:text-cream/50">
        {categories.description}
      </p>

      {categoryKeys.map((key) => {
        const section = categories[key];
        const isOpen = openSections[key] ?? false;

        return (
          <div
            key={key}
            className="border border-charcoal/10 dark:border-cream/10 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-4 py-3 bg-forest/5 dark:bg-gold/5 hover:bg-forest/10 dark:hover:bg-gold/10 transition-colors text-left"
            >
              <span className="font-heading font-semibold text-sm">
                {keyToTitle(key)}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-4 h-4 transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isOpen && (
              <div className="px-4 py-3 space-y-3 text-sm">
                {section.description && (
                  <p className="text-xs text-charcoal/60 dark:text-cream/60 italic">
                    {section.description}
                  </p>
                )}
                <DynamicRenderer data={section} skipKeys={['description']} depth={0} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Recursively renders any JSON structure from the point-categories data
 * without hardcoding field names.
 */
function DynamicRenderer({
  data,
  skipKeys = [],
  depth = 0,
}: {
  data: any;
  skipKeys?: string[];
  depth: number;
}) {
  if (data === null || data === undefined) return null;

  // Primitive
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return <span>{String(data)}</span>;
  }

  // Array
  if (Array.isArray(data)) {
    // If array of objects, render as a table-like list
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      const allKeys = Array.from(
        new Set(data.flatMap((item: any) => Object.keys(item))),
      );

      // If items are small (< 6 keys), render as a table
      if (allKeys.length <= 6) {
        return (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-forest/10 dark:bg-gold/10">
                  {allKeys.map((k) => (
                    <th
                      key={k}
                      className="px-2 py-1.5 text-left font-semibold whitespace-nowrap"
                    >
                      {keyToTitle(k)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, i: number) => (
                  <tr
                    key={i}
                    className="border-t border-charcoal/5 dark:border-cream/5"
                  >
                    {allKeys.map((k) => (
                      <td key={k} className="px-2 py-1.5 align-top">
                        {typeof row[k] === 'object' ? (
                          <DynamicRenderer data={row[k]} depth={depth + 1} />
                        ) : (
                          String(row[k] ?? '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      // Otherwise render each as a card
      return (
        <div className="space-y-3">
          {data.map((item: any, i: number) => (
            <div
              key={i}
              className="bg-charcoal/5 dark:bg-cream/5 rounded-lg p-3 space-y-1"
            >
              <DynamicRenderer data={item} depth={depth + 1} />
            </div>
          ))}
        </div>
      );
    }

    // Array of primitives
    return (
      <ul className="list-disc list-inside space-y-0.5">
        {data.map((item: any, i: number) => (
          <li key={i}>
            <DynamicRenderer data={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }

  // Object
  if (typeof data === 'object') {
    const keys = Object.keys(data).filter((k) => !skipKeys.includes(k));

    return (
      <div className={`space-y-2 ${depth > 0 ? '' : ''}`}>
        {keys.map((key) => {
          const value = data[key];

          // If it's a simple string/number, render inline
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            return (
              <div key={key}>
                <span className="font-semibold text-forest dark:text-gold text-xs">
                  {keyToTitle(key)}:
                </span>{' '}
                <span className="text-xs">{String(value)}</span>
              </div>
            );
          }

          // Complex nested value
          return (
            <div key={key}>
              <p className="font-semibold text-forest dark:text-gold text-xs mb-1">
                {keyToTitle(key)}
              </p>
              <div className="pl-2 border-l-2 border-forest/20 dark:border-gold/20">
                <DynamicRenderer data={value} depth={depth + 1} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Browse by category (collapsible groups)
// ---------------------------------------------------------------------------

function CategoryBrowser({
  tab,
  herbs,
  formulas,
  acupoints,
  onSelect,
}: {
  tab: Tab;
  herbs: Herb[];
  formulas: Formula[];
  acupoints: Acupoint[];
  onSelect: (item: DetailItem) => void;
}) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const toggleCat = (cat: string) =>
    setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));

  // Build grouped data
  const herbGroups = useMemo(() => {
    const map = new Map<string, Herb[]>();
    herbs.forEach((h) => {
      const arr = map.get(h.category) ?? [];
      arr.push(h);
      map.set(h.category, arr);
    });
    return map;
  }, [herbs]);

  const formulaGroups = useMemo(() => {
    const map = new Map<string, Formula[]>();
    formulas.forEach((f) => {
      const arr = map.get(f.category) ?? [];
      arr.push(f);
      map.set(f.category, arr);
    });
    return map;
  }, [formulas]);

  const acupointGroups = useMemo(() => {
    const map = new Map<string, Acupoint[]>();
    acupoints.forEach((a) => {
      const arr = map.get(a.channelName) ?? [];
      arr.push(a);
      map.set(a.channelName, arr);
    });
    return map;
  }, [acupoints]);

  const renderGroup = (
    label: string,
    items: { id: string; title: string; subtitle: string; item: DetailItem }[],
  ) => {
    const isOpen = openCats[label] ?? false;
    return (
      <div
        key={label}
        className="border border-charcoal/10 dark:border-cream/10 rounded-xl overflow-hidden"
      >
        <button
          onClick={() => toggleCat(label)}
          className="w-full flex items-center justify-between px-4 py-3 bg-forest/5 dark:bg-gold/5 hover:bg-forest/10 dark:hover:bg-gold/10 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-sm">{label}</span>
            <span className="text-xs text-charcoal/40 dark:text-cream/40">
              ({items.length})
            </span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {isOpen && (
          <div className="divide-y divide-charcoal/5 dark:divide-cream/5">
            {items.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelect(entry.item)}
                className="w-full text-left px-4 py-2.5 hover:bg-forest/5 dark:hover:bg-gold/5 transition-colors"
              >
                <p className="text-sm font-medium">{entry.title}</p>
                <p className="text-xs text-charcoal/50 dark:text-cream/50 truncate">
                  {entry.subtitle}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-lg font-bold text-forest dark:text-gold">
        Browse by Category
      </h3>

      {(tab === 'all' || tab === 'herbs') &&
        Array.from(herbGroups.entries()).map(([cat, items]) =>
          renderGroup(
            cat,
            items.map((h) => ({
              id: h.id,
              title: h.pinyin,
              subtitle: `${h.latin} - ${h.channels.join(', ')}`,
              item: { kind: 'herb' as const, data: h },
            })),
          ),
        )}

      {(tab === 'all' || tab === 'formulas') &&
        Array.from(formulaGroups.entries()).map(([cat, items]) =>
          renderGroup(
            cat,
            items.map((f) => ({
              id: f.id,
              title: f.pinyin,
              subtitle: f.english_name,
              item: { kind: 'formula' as const, data: f },
            })),
          ),
        )}

      {(tab === 'all' || tab === 'acupoints') &&
        Array.from(acupointGroups.entries()).map(([cat, items]) =>
          renderGroup(
            cat,
            items.map((a) => ({
              id: a.id,
              title: `${a.number} ${a.name}`,
              subtitle: a.english,
              item: { kind: 'acupoint' as const, data: a },
            })),
          ),
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main BrowsePage component
// ---------------------------------------------------------------------------

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // Herb filters
  const [herbCategoryFilter, setHerbCategoryFilter] = useState('');
  const [herbChannelFilters, setHerbChannelFilters] = useState<Set<string>>(
    new Set(),
  );
  const [herbTempFilter, setHerbTempFilter] = useState('');

  // Acupoint filters
  const [acuChannelFilters, setAcuChannelFilters] = useState<Set<string>>(
    new Set(),
  );
  const [acuCategoryFilters, setAcuCategoryFilters] = useState<Set<string>>(
    new Set(),
  );
  const [acuElementFilter, setAcuElementFilter] = useState('');

  // Debounce search input
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 250);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  // Filtered data
  const filteredHerbs = useMemo(() => {
    let list = herbsData as Herb[];
    if (debouncedQuery) list = list.filter((h) => matchHerb(h, debouncedQuery));
    if (herbCategoryFilter)
      list = list.filter((h) => h.category === herbCategoryFilter);
    if (herbTempFilter)
      list = list.filter((h) => h.temperature === herbTempFilter);
    if (herbChannelFilters.size > 0)
      list = list.filter((h) =>
        h.channels.some((c) => herbChannelFilters.has(c)),
      );
    return list;
  }, [debouncedQuery, herbCategoryFilter, herbTempFilter, herbChannelFilters]);

  const filteredFormulas = useMemo(() => {
    let list = formulasData as Formula[];
    if (debouncedQuery)
      list = list.filter((f) => matchFormula(f, debouncedQuery));
    return list;
  }, [debouncedQuery]);

  const filteredAcupoints = useMemo(() => {
    let list = acupointsData as Acupoint[];
    if (debouncedQuery)
      list = list.filter((a) => matchAcupoint(a, debouncedQuery));
    if (acuChannelFilters.size > 0)
      list = list.filter((a) => acuChannelFilters.has(a.channel));
    if (acuCategoryFilters.size > 0)
      list = list.filter((a) =>
        a.specialCategories.some((c) => acuCategoryFilters.has(c)),
      );
    if (acuElementFilter)
      list = list.filter((a) => a.element === acuElementFilter);
    return list;
  }, [debouncedQuery, acuChannelFilters, acuCategoryFilters, acuElementFilter]);

  const totalResults =
    (activeTab === 'all' || activeTab === 'herbs' ? filteredHerbs.length : 0) +
    (activeTab === 'all' || activeTab === 'formulas'
      ? filteredFormulas.length
      : 0) +
    (activeTab === 'all' || activeTab === 'acupoints'
      ? filteredAcupoints.length
      : 0);

  const toggleSetItem = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'herbs', label: 'Herbs' },
    { key: 'formulas', label: 'Formulas' },
    { key: 'acupoints', label: 'Acupoints' },
  ];

  const isSearching = debouncedQuery.length > 0;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Search bar */}
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 dark:text-cream/40"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search herbs, formulas, acupoints..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-white dark:bg-charcoal-light border border-charcoal/10 dark:border-cream/10 text-sm placeholder:text-charcoal/40 dark:placeholder:text-cream/40 focus:outline-none focus:ring-2 focus:ring-forest dark:focus:ring-gold transition-shadow"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-charcoal/10 dark:hover:bg-cream/10"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-charcoal/40 dark:text-cream/40"
            >
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-charcoal/5 dark:bg-cream/5 p-1 rounded-xl">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === t.key
                ? 'bg-forest text-cream dark:bg-gold dark:text-charcoal shadow-sm'
                : 'text-charcoal/60 dark:text-cream/60 hover:text-charcoal dark:hover:text-cream'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === 'herbs' || activeTab === 'all') && (
        <div className="space-y-2">
          <SectionLabel>Herb Filters</SectionLabel>

          {/* Category dropdown */}
          <select
            value={herbCategoryFilter}
            onChange={(e) => setHerbCategoryFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-charcoal-light border border-charcoal/10 dark:border-cream/10 focus:outline-none focus:ring-1 focus:ring-forest dark:focus:ring-gold"
          >
            <option value="">All Categories</option>
            {HERB_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Temperature */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-charcoal/40 dark:text-cream/40 self-center mr-1">
              Temp:
            </span>
            {HERB_TEMPS.map((t) => (
              <ChipToggle
                key={t}
                label={t}
                active={herbTempFilter === t}
                onToggle={() =>
                  setHerbTempFilter((prev) => (prev === t ? '' : t))
                }
              />
            ))}
          </div>

          {/* Channel chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-charcoal/40 dark:text-cream/40 self-center mr-1">
              Ch:
            </span>
            {ALL_CHANNELS.map((ch) => (
              <ChipToggle
                key={ch}
                label={ch}
                active={herbChannelFilters.has(ch)}
                onToggle={() => toggleSetItem(setHerbChannelFilters, ch)}
              />
            ))}
          </div>
        </div>
      )}

      {(activeTab === 'acupoints' || activeTab === 'all') && (
        <div className="space-y-2">
          <SectionLabel>Acupoint Filters</SectionLabel>

          {/* Channel chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-charcoal/40 dark:text-cream/40 self-center mr-1">
              Ch:
            </span>
            {ACUPOINT_CHANNELS.map((ch) => (
              <ChipToggle
                key={ch}
                label={ch}
                active={acuChannelFilters.has(ch)}
                onToggle={() => toggleSetItem(setAcuChannelFilters, ch)}
              />
            ))}
          </div>

          {/* Point category chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-charcoal/40 dark:text-cream/40 self-center mr-1">
              Cat:
            </span>
            {ACUPOINT_SPECIAL_CATS.map((c) => (
              <ChipToggle
                key={c}
                label={c}
                active={acuCategoryFilters.has(c)}
                onToggle={() => toggleSetItem(setAcuCategoryFilters, c)}
              />
            ))}
          </div>

          {/* Element */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-charcoal/40 dark:text-cream/40 self-center mr-1">
              Element:
            </span>
            {ACUPOINT_ELEMENTS.map((el) => (
              <ChipToggle
                key={el}
                label={el}
                active={acuElementFilter === el}
                onToggle={() =>
                  setAcuElementFilter((prev) => (prev === el ? '' : el))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-charcoal/50 dark:text-cream/50">
        {totalResults} result{totalResults !== 1 ? 's' : ''}
        {isSearching && ` for "${debouncedQuery}"`}
      </p>

      {/* Search results list */}
      {isSearching && (
        <div className="space-y-2">
          {(activeTab === 'all' || activeTab === 'herbs') &&
            filteredHerbs.map((h) => (
              <ResultRow
                key={h.id}
                badge="Herb"
                title={h.pinyin}
                subtitle={`${h.latin} — ${h.channels.join(', ')}`}
                onClick={() =>
                  setDetailItem({ kind: 'herb', data: h })
                }
              />
            ))}

          {(activeTab === 'all' || activeTab === 'formulas') &&
            filteredFormulas.map((f) => (
              <ResultRow
                key={f.id}
                badge="Formula"
                title={f.pinyin}
                subtitle={f.english_name}
                onClick={() =>
                  setDetailItem({ kind: 'formula', data: f })
                }
              />
            ))}

          {(activeTab === 'all' || activeTab === 'acupoints') &&
            filteredAcupoints.map((a) => (
              <ResultRow
                key={a.id}
                badge="Point"
                title={`${a.number} ${a.name}`}
                subtitle={`${a.english} — ${a.channelName}`}
                onClick={() =>
                  setDetailItem({ kind: 'acupoint', data: a })
                }
              />
            ))}

          {totalResults === 0 && (
            <div className="text-center py-10 text-charcoal/40 dark:text-cream/40">
              <p className="text-sm">No results found.</p>
              <p className="text-xs mt-1">
                Try a different search term or adjust filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Browse by category (when not searching) */}
      {!isSearching && (
        <CategoryBrowser
          tab={activeTab}
          herbs={filteredHerbs}
          formulas={filteredFormulas}
          acupoints={filteredAcupoints}
          onSelect={setDetailItem}
        />
      )}

      {/* Quick reference tables (acupoints tab) */}
      {(activeTab === 'acupoints' || activeTab === 'all') && (
        <PointCategoryReference />
      )}

      {/* Detail overlay */}
      <DetailOverlay item={detailItem} onClose={() => setDetailItem(null)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result row
// ---------------------------------------------------------------------------

function ResultRow({
  badge,
  title,
  subtitle,
  onClick,
}: {
  badge: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-charcoal-light border border-charcoal/5 dark:border-cream/5 hover:border-forest/30 dark:hover:border-gold/30 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          badge === 'Herb'
            ? 'bg-forest/10 text-forest dark:bg-gold/10 dark:text-gold'
            : badge === 'Formula'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        }`}
      >
        {badge}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{title}</p>
        <p className="text-xs text-charcoal/50 dark:text-cream/50 truncate">
          {subtitle}
        </p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0 text-charcoal/30 dark:text-cream/30"
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
