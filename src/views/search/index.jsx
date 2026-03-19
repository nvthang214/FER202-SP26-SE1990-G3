/* eslint-disable react/jsx-props-no-spreading */
import {
  FilterOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  StarFilled,
  AppstoreOutlined,
  UnorderedListOutlined,
  CaretDownOutlined,
  CaretUpOutlined
} from '@ant-design/icons';
import { Boundary, MessageDisplay, PriceRange } from '@/components/common';
import { ProductGrid } from '@/components/product';
import { useDidMount } from '@/hooks';
import PropType from 'prop-types';
import React, {
  useEffect, useState, useMemo, useCallback
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setRequestStatus } from '@/redux/actions/miscActions';
import { searchProduct } from '@/redux/actions/productActions';

// ── Constants ───────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'name-asc', label: 'Name A → Z' },
  { value: 'name-desc', label: 'Name Z → A' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' }
];

const EMPTY_FILTER = {
  brand: '',
  sortBy: '',
  minPrice: 0,
  maxPrice: 0,
  sizes: [],
  colors: [],
  isFeatured: false,
  isRecommended: false
};

// ── Helper: count active filter "chips" ─────────────────────────────────────
const countActive = (f) => {
  let n = 0;
  if (f.brand) n += 1;
  if (f.sortBy) n += 1;
  if (f.maxPrice > 0) n += 1;
  if (f.sizes.length) n += 1;
  if (f.colors.length) n += 1;
  if (f.isFeatured) n += 1;
  if (f.isRecommended) n += 1;
  return n;
};

// ── Sub-component: collapsible section ──────────────────────────────────────
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={styles.section}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={styles.sectionToggle}
      >
        <span style={styles.sectionTitle}>{title}</span>
        {open ? <CaretUpOutlined style={styles.caret} /> : <CaretDownOutlined style={styles.caret} />}
      </button>
      {open && <div style={styles.sectionBody}>{children}</div>}
    </div>
  );
};

FilterSection.propTypes = {
  title: PropType.string.isRequired,
  children: PropType.node.isRequired,
  defaultOpen: PropType.bool
};
FilterSection.defaultProps = { defaultOpen: true };

// ── Active filter pill ───────────────────────────────────────────────────────
const Chip = ({ label, onRemove }) => (
  <span style={styles.chip}>
    {label}
    <button type="button" onClick={onRemove} style={styles.chipRemove} aria-label="Remove filter">
      <CloseCircleOutlined />
    </button>
  </span>
);
Chip.propTypes = {
  label: PropType.string.isRequired,
  onRemove: PropType.func.isRequired
};

// ── Color dot ────────────────────────────────────────────────────────────────
const ColorDot = ({ color, selected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={color}
    style={{
      ...styles.colorDot,
      background: color,
      outline: selected ? '2px solid #101010' : '2px solid transparent',
      outlineOffset: '2px'
    }}
    aria-label={`Filter by color ${color}`}
  />
);
ColorDot.propTypes = {
  color: PropType.string.isRequired,
  selected: PropType.bool.isRequired,
  onClick: PropType.func.isRequired
};

// ── Main component ────────────────────────────────────────────────────────────
const Search = ({ match }) => {
  const { searchKey } = match.params;
  const dispatch = useDispatch();
  const didMount = useDidMount(true);

  const store = useSelector((state) => ({
    isLoading: state.app.loading,
    products: state.products.searchedProducts.items,
    basket: state.basket,
    requestStatus: state.app.requestStatus
  }));

  const [filter, setFilter] = useState({ ...EMPTY_FILTER });
  const [activeFilters, setActiveFilters] = useState({ ...EMPTY_FILTER });
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Reset when keyword changes
  useEffect(() => {
    setFilter({ ...EMPTY_FILTER });
    setActiveFilters({ ...EMPTY_FILTER });
  }, [searchKey]);

  useEffect(() => {
    if (didMount && !store.isLoading) {
      dispatch(searchProduct(searchKey));
    }
  }, [searchKey]);

  useEffect(() => () => { dispatch(setRequestStatus('')); }, []);

  // ── Derived filter options ────────────────────────────────────────────────
  const brands = useMemo(() => {
    const set = new Set(store.products.map((p) => p.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [store.products]);

  const allSizes = useMemo(() => {
    const set = new Set(
      store.products.flatMap((p) => (Array.isArray(p.sizes) ? p.sizes : [])).filter(Boolean)
    );
    return Array.from(set).sort();
  }, [store.products]);

  const allColors = useMemo(() => {
    const set = new Set(
      store.products
        .flatMap((p) => (Array.isArray(p.availableColors) ? p.availableColors : []))
        .filter(Boolean)
    );
    return Array.from(set);
  }, [store.products]);

  const priceMin = useMemo(() => (store.products.length ? Math.floor(Math.min(...store.products.map((p) => p.price))) : 0), [store.products]);
  const priceMax = useMemo(() => (store.products.length ? Math.ceil(Math.max(...store.products.map((p) => p.price))) : 0), [store.products]);

  // ── Apply filters + sort ──────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = [...store.products];

    if (activeFilters.brand) result = result.filter((p) => p.brand === activeFilters.brand);
    if (activeFilters.maxPrice > 0) {
      result = result.filter((p) => p.price >= activeFilters.minPrice && p.price <= activeFilters.maxPrice);
    }
    if (activeFilters.sizes.length > 0) {
      result = result.filter((p) => Array.isArray(p.sizes)
        && activeFilters.sizes.some((s) => p.sizes.includes(s)));
    }
    if (activeFilters.colors.length > 0) {
      result = result.filter((p) => Array.isArray(p.availableColors)
        && activeFilters.colors.some((c) => p.availableColors.includes(c)));
    }
    if (activeFilters.isFeatured) result = result.filter((p) => p.isFeatured);
    if (activeFilters.isRecommended) result = result.filter((p) => p.isRecommended);

    if (activeFilters.sortBy === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (activeFilters.sortBy === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));
    else if (activeFilters.sortBy === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (activeFilters.sortBy === 'price-desc') result.sort((a, b) => b.price - a.price);

    return result;
  }, [store.products, activeFilters]);

  const activeCount = countActive(activeFilters);
  const hasProducts = store.products.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleSize = useCallback((s) => {
    setFilter((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s]
    }));
  }, []);

  const toggleColor = useCallback((c) => {
    setFilter((f) => ({
      ...f,
      colors: f.colors.includes(c) ? f.colors.filter((x) => x !== c) : [...f.colors, c]
    }));
  }, []);

  const onApplyFilter = () => {
    setActiveFilters({ ...filter });
    setMobileSidebarOpen(false);
  };

  const onResetFilter = () => {
    setFilter({ ...EMPTY_FILTER });
    setActiveFilters({ ...EMPTY_FILTER });
  };

  const onRemoveChip = (key) => {
    const upd = { ...activeFilters };
    if (key === 'price') { upd.minPrice = 0; upd.maxPrice = 0; setFilter((f) => ({ ...f, minPrice: 0, maxPrice: 0 })); }
    else if (key === 'sizes') { upd.sizes = []; setFilter((f) => ({ ...f, sizes: [] })); }
    else if (key === 'colors') { upd.colors = []; setFilter((f) => ({ ...f, colors: [] })); }
    else if (key === 'isFeatured' || key === 'isRecommended') { upd[key] = false; setFilter((f) => ({ ...f, [key]: false })); }
    else { upd[key] = ''; setFilter((f) => ({ ...f, [key]: '' })); }
    setActiveFilters(upd);
  };

  // ── States ────────────────────────────────────────────────────────────────
  if (store.isLoading) {
    return (
      <main className="content">
        <div className="loader">
          <h4>Searching Product...</h4>
          <br />
          <LoadingOutlined style={{ fontSize: '3rem' }} />
        </div>
      </main>
    );
  }

  if (store.requestStatus && !store.isLoading) {
    return (
      <main className="content">
        <MessageDisplay message={store.requestStatus} desc="Try using correct filters or keyword." />
      </main>
    );
  }

  // ── Sidebar JSX ───────────────────────────────────────────────────────────
  const sidebar = (
    <aside style={styles.sidebar}>
      {/* Sidebar header */}
      <div style={styles.sidebarHeader}>
        <span style={styles.sidebarTitle}>
          <FilterOutlined style={{ marginRight: 7 }} />
          Filters
          {activeCount > 0 && <span style={styles.badge}>{activeCount}</span>}
        </span>
        {activeCount > 0 && (
          <button type="button" onClick={onResetFilter} style={styles.resetBtn}>
            <ReloadOutlined />
            {' '}
            Reset all
          </button>
        )}
      </div>

      {/* Sort */}
      <FilterSection title="Sort By">
        <div style={styles.radioGroup}>
          {SORT_OPTIONS.map((opt) => (
            <label key={opt.value} style={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value={opt.value}
                checked={filter.sortBy === opt.value}
                onChange={() => setFilter((f) => ({ ...f, sortBy: opt.value }))}
                style={styles.radioInput}
              />
              <span style={{ ...styles.radioText, fontWeight: filter.sortBy === opt.value ? 600 : 400 }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Brand */}
      {brands.length > 0 && (
        <FilterSection title="Brand">
          <select
            value={filter.brand}
            onChange={(e) => setFilter((f) => ({ ...f, brand: e.target.value }))}
            style={styles.select}
          >
            <option value="">All Brands</option>
            {brands.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </FilterSection>
      )}

      {/* Price Range */}
      {priceMax > priceMin && (
        <FilterSection title="Price Range">
          <PriceRange
            min={priceMin}
            max={priceMax}
            initMin={filter.minPrice || priceMin}
            initMax={filter.maxPrice || priceMax}
            isLoading={false}
            productsCount={store.products.length}
            onPriceChange={(minVal, maxVal) => setFilter((f) => ({ ...f, minPrice: minVal, maxPrice: maxVal }))}
          />
        </FilterSection>
      )}

      {/* Sizes */}
      {allSizes.length > 0 && (
        <FilterSection title="Size">
          <div style={styles.sizeGrid}>
            {allSizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                style={{
                  ...styles.sizeBtn,
                  background: filter.sizes.includes(s) ? '#101010' : '#f5f5f5',
                  color: filter.sizes.includes(s) ? '#fff' : '#333',
                  borderColor: filter.sizes.includes(s) ? '#101010' : '#e0e0e0'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Colors */}
      {allColors.length > 0 && (
        <FilterSection title="Color">
          <div style={styles.colorRow}>
            {allColors.map((c) => (
              <ColorDot
                key={c}
                color={c}
                selected={filter.colors.includes(c)}
                onClick={() => toggleColor(c)}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Special flags */}
      <FilterSection title="Collection" defaultOpen={false}>
        <label style={styles.checkLabel}>
          <input
            type="checkbox"
            checked={filter.isFeatured}
            onChange={(e) => setFilter((f) => ({ ...f, isFeatured: e.target.checked }))}
            style={styles.checkInput}
          />
          <StarFilled style={{ color: '#e4a51f', marginRight: 6 }} />
          Featured only
        </label>
        <label style={{ ...styles.checkLabel, marginTop: 8 }}>
          <input
            type="checkbox"
            checked={filter.isRecommended}
            onChange={(e) => setFilter((f) => ({ ...f, isRecommended: e.target.checked }))}
            style={styles.checkInput}
          />
          <StarFilled style={{ color: '#3b9620', marginRight: 6 }} />
          Recommended only
        </label>
      </FilterSection>

      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          type="button"
          className="button button-small"
          onClick={onApplyFilter}
          style={styles.applyBtn}
        >
          Apply Filters
        </button>
        <button
          type="button"
          className="button button-border button-small"
          onClick={onResetFilter}
          disabled={countActive(filter) === 0 && activeCount === 0}
          style={styles.resetBtnFull}
        >
          Reset
        </button>
      </div>
    </aside>
  );

  return (
    <Boundary>
      {/* Mobile filter overlay */}
      {mobileSidebarOpen && (
        <div style={styles.overlay} onClick={() => setMobileSidebarOpen(false)} role="presentation">
          <div style={styles.mobileSidebar} onClick={(e) => e.stopPropagation()} role="presentation">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              style={styles.closeBtn}
              aria-label="Close filters"
            >
              <CloseCircleOutlined />
              {' '}
              Close
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <main className="content" style={styles.main}>
        {/* ── Results panel ── */}
        <section style={styles.results}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.resultCount}>
              <h5 style={{ margin: 0 }}>
                {activeCount > 0
                  ? (
                    <>
                      <span style={styles.countHighlight}>{filteredProducts.length}</span>
                      {` of ${store.products.length} results for `}
                      <em style={{ fontStyle: 'italic' }}>&ldquo;{searchKey}&rdquo;</em>
                    </>
                  )
                  : (
                    <>
                      <span style={styles.countHighlight}>{store.products.length}</span>
                      {` ${store.products.length === 1 ? 'result' : 'results'} for `}
                      <em style={{ fontStyle: 'italic' }}>&ldquo;{searchKey}&rdquo;</em>
                    </>
                  )}
              </h5>
            </div>

            <div style={styles.toolbarRight}>
              {/* Mobile filter trigger */}
              {hasProducts && (
                <button
                  type="button"
                  className="button button-border button-small"
                  onClick={() => setMobileSidebarOpen(true)}
                  style={styles.mobileFilterBtn}
                >
                  <FilterOutlined />
                  {' '}
                  Filter
                  {activeCount > 0 && <span style={styles.badgeSmall}>{activeCount}</span>}
                </button>
              )}

              {/* View mode toggle */}
              <div style={styles.viewToggle}>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  style={{ ...styles.viewBtn, background: viewMode === 'grid' ? '#101010' : 'transparent', color: viewMode === 'grid' ? '#fff' : '#888' }}
                  aria-label="Grid view"
                >
                  <AppstoreOutlined />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  style={{ ...styles.viewBtn, background: viewMode === 'list' ? '#101010' : 'transparent', color: viewMode === 'list' ? '#fff' : '#888' }}
                  aria-label="List view"
                >
                  <UnorderedListOutlined />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div style={styles.chipRow}>
              {activeFilters.brand && (
                <Chip label={`Brand: ${activeFilters.brand}`} onRemove={() => onRemoveChip('brand')} />
              )}
              {activeFilters.sortBy && (
                <Chip label={`Sort: ${SORT_OPTIONS.find((o) => o.value === activeFilters.sortBy)?.label}`} onRemove={() => onRemoveChip('sortBy')} />
              )}
              {activeFilters.maxPrice > 0 && (
                <Chip label={`$${activeFilters.minPrice} – $${activeFilters.maxPrice}`} onRemove={() => onRemoveChip('price')} />
              )}
              {activeFilters.sizes.length > 0 && (
                <Chip label={`Size: ${activeFilters.sizes.join(', ')}`} onRemove={() => onRemoveChip('sizes')} />
              )}
              {activeFilters.colors.length > 0 && (
                <Chip label={`Color: ${activeFilters.colors.length} selected`} onRemove={() => onRemoveChip('colors')} />
              )}
              {activeFilters.isFeatured && (
                <Chip label="⭐ Featured" onRemove={() => onRemoveChip('isFeatured')} />
              )}
              {activeFilters.isRecommended && (
                <Chip label="✅ Recommended" onRemove={() => onRemoveChip('isRecommended')} />
              )}
              <button type="button" onClick={onResetFilter} style={styles.clearAll}>
                Clear all
              </button>
            </div>
          )}

          {/* Products */}
          {filteredProducts.length === 0 ? (
            <MessageDisplay
              message="No products match the selected filters."
              desc="Try adjusting or resetting the filters."
            />
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </section>

        {/* ── Sidebar (desktop) ── */}
        {hasProducts && <div style={styles.desktopSidebar}>{sidebar}</div>}
      </main>
    </Boundary>
  );
};

// ── Styles object ─────────────────────────────────────────────────────────────
const styles = {
  main: {
    display: 'flex',
    gap: '2.8rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  results: {
    flex: 1,
    minWidth: 0
  },
  // toolbar
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.4rem',
    flexWrap: 'wrap',
    gap: '0.8rem'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem'
  },
  resultCount: { flex: 1 },
  countHighlight: { fontWeight: 700, fontSize: '1.1em' },
  viewToggle: {
    display: 'flex',
    border: '1px solid #e1e1e1',
    borderRadius: 6,
    overflow: 'hidden'
  },
  viewBtn: {
    border: 'none',
    cursor: 'pointer',
    padding: '7px 13px',
    fontSize: '1.05rem',
    transition: 'background 0.15s'
  },
  mobileFilterBtn: {
    display: 'none',
    alignItems: 'center',
    gap: 6,
    position: 'relative'
  },
  badgeSmall: {
    background: '#101010',
    color: '#fff',
    borderRadius: '50%',
    padding: '1px 6px',
    fontSize: '0.72rem',
    marginLeft: 4
  },

  // chip row
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.7rem',
    alignItems: 'center',
    marginBottom: '1.4rem',
    padding: '0.9rem 1.2rem',
    background: '#fafafa',
    borderRadius: 8,
    border: '1px solid #f0f0f0'
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#101010',
    color: '#fff',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: '0.82rem',
    fontWeight: 500,
    fontFamily: 'inherit'
  },
  chipRemove: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ccc',
    padding: 0,
    lineHeight: 1,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center'
  },
  clearAll: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#888',
    fontSize: '0.84rem',
    textDecoration: 'underline',
    padding: 0,
    fontFamily: 'inherit'
  },

  // sidebar shared
  sidebar: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #ebebeb',
    padding: '1.8rem 1.6rem',
    boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
    fontFamily: 'inherit',
    fontSize: '0.95rem'
  },
  desktopSidebar: {
    width: 280,
    flexShrink: 0,
    position: 'sticky',
    top: 90
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #ebebeb'
  },
  sidebarTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  badge: {
    background: '#101010',
    color: '#fff',
    borderRadius: '50%',
    padding: '2px 7px',
    fontSize: '0.72rem',
    marginLeft: 6
  },
  resetBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#999',
    fontSize: '0.82rem',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: 0,
    fontFamily: 'inherit'
  },

  // section
  section: {
    marginBottom: '0.2rem',
    borderBottom: '1px solid #f0f0f0'
  },
  sectionToggle: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 0',
    textAlign: 'left'
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#555',
    fontFamily: 'inherit'
  },
  caret: { color: '#bbb', fontSize: '0.8rem' },
  sectionBody: { paddingBottom: '1rem' },

  // radio sort
  radioGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  radioLabel: {
    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '5px 0'
  },
  radioInput: { accentColor: '#101010', cursor: 'pointer', width: 15, height: 15 },
  radioText: { fontSize: '0.92rem', color: '#333', fontFamily: 'inherit', lineHeight: 1.4 },

  // select
  select: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: 7,
    border: '1px solid #e0e0e0',
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    background: '#fafafa',
    cursor: 'pointer',
    outline: 'none'
  },

  // sizes
  sizeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  sizeBtn: {
    border: '1px solid',
    borderRadius: 7,
    padding: '6px 14px',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    fontWeight: 500,
    transition: 'all 0.15s',
    minWidth: 42,
    textAlign: 'center'
  },

  // colors
  colorRow: { display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    transition: 'outline 0.1s'
  },

  // checkbox
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: '0.92rem',
    fontFamily: 'inherit',
    cursor: 'pointer',
    color: '#333',
    padding: '4px 0'
  },
  checkInput: { accentColor: '#101010', cursor: 'pointer', width: 15, height: 15 },

  // action buttons
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: '1.2rem',
    paddingTop: '1.2rem',
    borderTop: '1px solid #f0f0f0'
  },
  applyBtn: { width: '100%' },
  resetBtnFull: { width: '100%' },

  // mobile overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 999,
    display: 'flex',
    justifyContent: 'flex-end'
  },
  mobileSidebar: {
    width: 320,
    height: '100%',
    background: '#fff',
    overflowY: 'auto',
    padding: '1.8rem',
    boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    color: '#333',
    marginBottom: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 0,
    fontFamily: 'inherit'
  }
};

Search.propTypes = {
  match: PropType.shape({
    params: PropType.shape({
      searchKey: PropType.string
    })
  }).isRequired
};

export default Search;