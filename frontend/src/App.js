import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import axios from "axios";

const API = "http://localhost:8000";

// ─── THEME ────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#090c12",
  surface:  "#0d1018",
  card:     "#111520",
  cardHi:   "#161b28",
  border:   "#1c2030",
  borderHi: "#252a3a",
  accent:   "#00e5a0",
  accentBg: "rgba(0,229,160,0.08)",
  warn:     "#f59e0b",
  warnBg:   "rgba(245,158,11,0.08)",
  error:    "#ff4545",
  errorBg:  "rgba(255,69,69,0.08)",
  blue:     "#4f8ef7",
  blueBg:   "rgba(79,142,247,0.08)",
  t1: "#f0f2f8",
  t2: "#7a8099",
  t3: "#3d4260",
  t4: "#1e2235",
};

// ─── DEFAULT QUICK-ADD PRODUCTS ───────────────────────────────────────────────
const DEFAULT_QUICK = [
  { id: "q1",  emoji: "🚬", name: "Cigarro",        sale_price: 12,  barcode: "QUICK-CIG", category: "misc"  },
  { id: "q2",  emoji: "🍬", name: "Chicle",          sale_price: 5,   barcode: "QUICK-CHI", category: "misc"  },
  { id: "q3",  emoji: "😷", name: "Cubrebocas",      sale_price: 10,  barcode: "QUICK-CUB", category: "misc"  },
  { id: "q4",  emoji: "🥤", name: "Agua 500ml",      sale_price: 15,  barcode: "QUICK-AGU", category: "drink" },
  { id: "q5",  emoji: "🧃", name: "Jugo",            sale_price: 18,  barcode: "QUICK-JUG", category: "drink" },
  { id: "q6",  emoji: "🍫", name: "Chocolate",       sale_price: 22,  barcode: "QUICK-CHO", category: "food"  },
  { id: "q7",  emoji: "🍪", name: "Galletas",        sale_price: 16,  barcode: "QUICK-GAL", category: "food"  },
  { id: "q8",  emoji: "🔋", name: "Pila AA",         sale_price: 28,  barcode: "QUICK-PIL", category: "misc"  },
  { id: "q9",  emoji: "💊", name: "Paracetamol",     sale_price: 35,  barcode: "QUICK-PAR", category: "misc"  },
  { id: "q10", emoji: "🍭", name: "Dulce",           sale_price: 3,   barcode: "QUICK-DUL", category: "food"  },
  { id: "q11", emoji: "🧴", name: "Alcohol Gel",     sale_price: 30,  barcode: "QUICK-ALC", category: "misc"  },
  { id: "q12", emoji: "📦", name: "Bolsa",           sale_price: 2,   barcode: "QUICK-BOL", category: "misc"  },
];

const CATEGORY_LABELS = { all: "Todos", drink: "Bebidas", food: "Comida", misc: "Varios" };

// ─── HOOKS ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2800);
  }, []);
  return { toasts, show };
}

function useCart() {
  const [items, setItems] = useState([]);
  const add = useCallback((product) => {
    setItems(prev => {
      const ex = prev.find(p => p.barcode === product.barcode);
      if (ex) return prev.map(p => p.barcode === product.barcode ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);
  const inc = useCallback((bc) => setItems(p => p.map(x => x.barcode === bc ? { ...x, qty: x.qty + 1 } : x)), []);
  const dec = useCallback((bc) => setItems(p => {
    const it = p.find(x => x.barcode === bc);
    if (!it) return p;
    return it.qty <= 1 ? p.filter(x => x.barcode !== bc) : p.map(x => x.barcode === bc ? { ...x, qty: x.qty - 1 } : x);
  }), []);
  const del = useCallback((bc) => setItems(p => p.filter(x => x.barcode !== bc)), []);
  const clear = useCallback(() => setItems([]), []);
  const total = useMemo(() => items.reduce((s, p) => s + p.sale_price * p.qty, 0), [items]);
  const unitCount = useMemo(() => items.reduce((s, p) => s + p.qty, 0), [items]);
  return { items, add, inc, dec, del, clear, total, unitCount };
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const mono = { fontFamily: "'JetBrains Mono', monospace" };

function Label({ children }) {
  return <span style={{ display: "block", ...mono, fontSize: 9, letterSpacing: 2.5, color: C.t3, marginBottom: 5, textTransform: "uppercase" }}>{children}</span>;
}

function FInput({ value, onChange, placeholder, type = "text", style }) {
  const [focused, setFocused] = useState(false);
  return (
    <input value={value} onChange={onChange} placeholder={placeholder} type={type}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ width: "100%", background: C.bg, border: `1px solid ${focused ? C.accent : C.borderHi}`, borderRadius: 7, color: C.t1, ...mono, fontSize: 13, padding: "10px 12px", outline: "none", boxSizing: "border-box", transition: "border-color 0.18s", colorScheme: "dark", ...style }}
    />
  );
}

// ─── TOASTS ───────────────────────────────────────────────────────────────────
function Toasts({ toasts }) {
  return (
    <div style={{ position: "fixed", top: 18, right: 18, zIndex: 9999, display: "flex", flexDirection: "column", gap: 7 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding: "9px 15px", borderRadius: 7, ...mono, fontSize: 12, fontWeight: 600, background: t.type === "error" ? C.error : t.type === "warn" ? C.warn : C.accent, color: "#000", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", animation: "toastIn 0.2s ease" }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── NEW PRODUCT MODAL ────────────────────────────────────────────────────────
function NewProductModal({ barcode, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ name: "", purchase_price: "", sale_price: "", stock: "1", supplier: "", expiration: "" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && parseFloat(form.purchase_price) > 0 && parseFloat(form.sale_price) > 0 && parseInt(form.stock) >= 0;
  const margin = (parseFloat(form.purchase_price) > 0 && parseFloat(form.sale_price) > 0)
    ? (((parseFloat(form.sale_price) - parseFloat(form.purchase_price)) / parseFloat(form.purchase_price)) * 100).toFixed(1) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: 440, boxShadow: "0 32px 100px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <span style={{ ...mono, fontSize: 9, color: C.warn, letterSpacing: 3 }}>PRODUCTO NO ENCONTRADO</span>
          <div style={{ color: C.t1, fontSize: 19, fontWeight: 700, ...mono, marginTop: 4 }}>Registrar producto</div>
          <code style={{ display: "inline-block", marginTop: 8, padding: "4px 9px", background: C.surface, borderRadius: 5, fontSize: 11, color: C.t2, border: `1px solid ${C.border}`, ...mono }}>{barcode}</code>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div><Label>Nombre *</Label><FInput value={form.name} onChange={set("name")} placeholder="Ej. Coca Cola 600ml" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Precio compra *</Label><FInput value={form.purchase_price} onChange={set("purchase_price")} placeholder="0.00" type="number" /></div>
            <div><Label>Precio venta *</Label><FInput value={form.sale_price} onChange={set("sale_price")} placeholder="0.00" type="number" /></div>
          </div>
          {margin !== null && (
            <div style={{ background: parseFloat(margin) >= 0 ? C.accentBg : C.errorBg, border: `1px solid ${parseFloat(margin) >= 0 ? C.accent : C.error}22`, borderRadius: 6, padding: "7px 11px" }}>
              <span style={{ ...mono, fontSize: 11, color: parseFloat(margin) >= 0 ? C.accent : C.error }}>Margen: {margin}%</span>
            </div>
          )}
          <div><Label>Stock inicial *</Label><FInput value={form.stock} onChange={set("stock")} placeholder="0" type="number" /></div>
          <div><Label>Proveedor</Label><FInput value={form.supplier} onChange={set("supplier")} placeholder="Ej. Distribuidora Central" /></div>
          <div><Label>Fecha de vencimiento</Label><FInput value={form.expiration} onChange={set("expiration")} type="date" /></div>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 22 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${C.borderHi}`, borderRadius: 8, color: C.t2, ...mono, fontSize: 12, cursor: "pointer", letterSpacing: 2 }}>CANCELAR</button>
          <button onClick={() => onSave({ ...form, barcode })} disabled={!valid || loading}
            style={{ flex: 2, padding: "12px", background: valid && !loading ? C.accent : C.cardHi, border: "none", borderRadius: 8, color: valid && !loading ? "#000" : C.t3, ...mono, fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: valid && !loading ? "pointer" : "not-allowed", transition: "all 0.18s" }}>
            {loading ? "GUARDANDO..." : "GUARDAR Y AGREGAR"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD QUICK MODAL ──────────────────────────────────────────────────────────
function AddQuickModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ emoji: "🛒", name: "", sale_price: "", category: "misc" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && parseFloat(form.sale_price) > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 26, width: 360, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <span style={{ ...mono, fontSize: 9, color: C.blue, letterSpacing: 3 }}>NUEVO ACCESO RÁPIDO</span>
        <div style={{ color: C.t1, fontSize: 17, fontWeight: 700, ...mono, marginTop: 4, marginBottom: 20 }}>Agregar producto</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 10 }}>
            <div><Label>Emoji</Label><FInput value={form.emoji} onChange={set("emoji")} placeholder="🛒" /></div>
            <div><Label>Nombre *</Label><FInput value={form.name} onChange={set("name")} placeholder="Ej. Cigarro suelto" /></div>
          </div>
          <div><Label>Precio venta *</Label><FInput value={form.sale_price} onChange={set("sale_price")} placeholder="0.00" type="number" /></div>
          <div>
            <Label>Categoría</Label>
            <select value={form.category} onChange={set("category")} style={{ width: "100%", background: C.bg, border: `1px solid ${C.borderHi}`, borderRadius: 7, color: C.t1, ...mono, fontSize: 13, padding: "10px 12px", outline: "none", colorScheme: "dark" }}>
              <option value="misc">Varios</option><option value="drink">Bebidas</option><option value="food">Comida</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: `1px solid ${C.borderHi}`, borderRadius: 8, color: C.t2, ...mono, fontSize: 12, cursor: "pointer", letterSpacing: 2 }}>CANCELAR</button>
          <button onClick={() => { if (!valid) return; onAdd({ id: `q-${Date.now()}`, emoji: form.emoji || "🛒", name: form.name.trim(), sale_price: parseFloat(form.sale_price), barcode: `QUICK-${Date.now()}`, category: form.category }); onClose(); }}
            disabled={!valid} style={{ flex: 2, padding: "12px", background: valid ? C.blue : C.cardHi, border: "none", borderRadius: 8, color: valid ? "#fff" : C.t3, ...mono, fontWeight: 700, fontSize: 12, letterSpacing: 2, cursor: valid ? "pointer" : "not-allowed" }}>
            AGREGAR
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SUCCESS SCREEN ───────────────────────────────────────────────────────────
function SuccessScreen({ total, unitCount, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
      <div style={{ background: C.card, border: `1px solid ${C.accent}`, borderRadius: 20, padding: "52px 64px", textAlign: "center", ...mono, boxShadow: `0 0 80px ${C.accent}22` }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.accentBg, border: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: 28, color: C.accent }}>✓</div>
        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 4, marginBottom: 10 }}>VENTA COMPLETADA</div>
        <div style={{ color: C.t1, fontSize: 52, fontWeight: 700, fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>${total.toFixed(2)}</div>
        <div style={{ fontSize: 12, color: C.t3, marginBottom: 32 }}>{unitCount} artículo{unitCount !== 1 ? "s" : ""}</div>
        <button onClick={onClose} style={{ padding: "13px 48px", background: C.accent, color: "#000", border: "none", borderRadius: 9, ...mono, fontWeight: 700, fontSize: 13, letterSpacing: 2, cursor: "pointer" }}>NUEVA VENTA</button>
      </div>
    </div>
  );
}

// ─── CART ROW ─────────────────────────────────────────────────────────────────
function CartRow({ item, onInc, onDec, onDel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.border}`, gap: 7 }}>
      {item.emoji && <span style={{ fontSize: 15 }}>{item.emoji}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", ...mono, fontSize: 12, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</span>
        <span style={{ ...mono, fontSize: 10, color: C.t3 }}>${item.sale_price.toFixed(2)} c/u</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[["−", onDec], ["+", onInc]].map(([lbl, fn], i) => (
          <button key={i} onClick={() => fn(item.barcode)} style={{ width: 23, height: 23, borderRadius: 5, background: C.cardHi, border: `1px solid ${C.borderHi}`, color: C.t2, cursor: "pointer", fontSize: 13 }}>{lbl}</button>
        ))}
        <span style={{ ...mono, fontSize: 12, color: C.t1, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
      </div>
      <span style={{ ...mono, fontSize: 12, color: C.accent, fontWeight: 700, minWidth: 56, textAlign: "right" }}>${(item.sale_price * item.qty).toFixed(2)}</span>
      <button onClick={() => onDel(item.barcode)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 17, padding: "0 2px", lineHeight: 1, transition: "color 0.15s" }}
        onMouseEnter={e => e.target.style.color = C.error} onMouseLeave={e => e.target.style.color = C.t3}>×</button>
    </div>
  );
}

// ─── QUICK CARD ───────────────────────────────────────────────────────────────
function QuickCard({ product, onAdd, onRemove, isEditing }) {
  const [pressed, setPressed] = useState(false);
  const handle = () => {
    if (isEditing) return;
    setPressed(true);
    onAdd(product);
    setTimeout(() => setPressed(false), 180);
  };
  return (
    <div style={{ position: "relative" }}>
      <button onClick={handle} style={{ width: "100%", background: pressed ? C.accentBg : C.card, border: `1px solid ${pressed ? C.accent + "55" : C.border}`, borderRadius: 10, padding: "11px 6px", cursor: isEditing ? "default" : "pointer", transition: "all 0.13s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, transform: pressed ? "scale(0.94)" : "scale(1)", opacity: isEditing ? 0.65 : 1 }}>
        <span style={{ fontSize: 22 }}>{product.emoji}</span>
        <span style={{ ...mono, fontSize: 10, color: C.t2, textAlign: "center", maxWidth: 70, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{product.name}</span>
        <span style={{ ...mono, fontSize: 11, color: C.accent, fontWeight: 700 }}>${product.sale_price}</span>
      </button>
      {isEditing && (
        <button onClick={() => onRemove(product.id)} style={{ position: "absolute", top: -7, right: -7, width: 19, height: 19, borderRadius: "50%", background: C.error, border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1 }}>×</button>
      )}
    </div>
  );
}

// ─── QUICK PANEL ─────────────────────────────────────────────────────────────
function QuickPanel({ onAdd }) {
  const [products, setProducts] = useState(() => {
    try { const s = localStorage.getItem("scanpos-quick"); return s ? JSON.parse(s) : DEFAULT_QUICK; } catch { return DEFAULT_QUICK; }
  });
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");

  const save = list => { setProducts(list); try { localStorage.setItem("scanpos-quick", JSON.stringify(list)); } catch {} };
  const removeProduct = id => save(products.filter(p => p.id !== id));
  const addProduct = p => save([...products, p]);

  const filtered = useMemo(() => {
    let list = filter === "all" ? products : products.filter(p => p.category === filter);
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [products, filter, search]);

  return (
    <>
      {showAdd && <AddQuickModal onAdd={addProduct} onClose={() => setShowAdd(false)} />}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.surface, borderRight: `1px solid ${C.border}` }}>
        {/* Header */}
        <div style={{ padding: "14px 14px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...mono, fontSize: 9, color: C.t2, letterSpacing: 2.5 }}>⚡ ACCESO RÁPIDO</span>
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setShowAdd(true)} style={{ background: C.blueBg, border: `1px solid ${C.blue}33`, color: C.blue, borderRadius: 6, padding: "3px 8px", cursor: "pointer", ...mono, fontSize: 9, letterSpacing: 1 }}>+ AÑADIR</button>
              <button onClick={() => setEditing(e => !e)} style={{ background: editing ? C.warnBg : "transparent", border: `1px solid ${editing ? C.warn + "55" : C.borderHi}`, color: editing ? C.warn : C.t3, borderRadius: 6, padding: "3px 8px", cursor: "pointer", ...mono, fontSize: 9, letterSpacing: 1 }}>
                {editing ? "LISTO" : "EDITAR"}
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 8 }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 11, opacity: 0.35 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, color: C.t1, ...mono, fontSize: 11, padding: "6px 8px 6px 27px", outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ flex: 1, padding: "4px 0", borderRadius: 6, border: `1px solid ${filter === k ? C.accent + "55" : C.border}`, background: filter === k ? C.accentBg : "transparent", color: filter === k ? C.accent : C.t3, ...mono, fontSize: 8, letterSpacing: 0.5, cursor: "pointer", transition: "all 0.13s" }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
          {filtered.length === 0
            ? <div style={{ textAlign: "center", padding: "28px 0" }}><span style={{ ...mono, fontSize: 9, color: C.t3, letterSpacing: 2 }}>SIN RESULTADOS</span></div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7 }}>
                {filtered.map(p => <QuickCard key={p.id} product={p} onAdd={onAdd} onRemove={removeProduct} isEditing={editing} />)}
              </div>
          }
        </div>

        {/* Count */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "7px 14px", flexShrink: 0 }}>
          <span style={{ ...mono, fontSize: 9, color: C.t3 }}>{products.length} productos · {filtered.length} visibles</span>
        </div>
      </div>
    </>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const videoRef = useRef(null);
  const lastScanRef = useRef(0);
  const startedRef = useRef(false);
  const newProductCodeRef = useRef(null);

  const [newProductCode, setNewProductCode] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [scannerStatus, setScannerStatus] = useState("idle");

  const { items: cart, add, inc, dec, del, clear, total, unitCount } = useCart();
  const { toasts, show: toast } = useToast();

  // ── Scanner ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const reader = new BrowserMultiFormatReader();
    let controls;

    reader.decodeFromVideoDevice(null, videoRef.current, async (result) => {
      if (!result || newProductCodeRef.current) return;
      const now = Date.now();
      if (now - lastScanRef.current < 1800) return;
      lastScanRef.current = now;

      const code = result.getText();
      new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg").play().catch(() => {});
      setScannerStatus("scanning");

      try {
        const res = await axios.get(`${API}/products/${code}`);
        if (res.data.found) {
          add(res.data.product);
          toast(`✓ ${res.data.product.name}`);
          setScannerStatus("found");
        } else {
          newProductCodeRef.current = code;
          setNewProductCode(code);
          setScannerStatus("unknown");
        }
      } catch {
        toast("Error al conectar con el servidor", "error");
        setScannerStatus("idle");
      }
      setTimeout(() => setScannerStatus("idle"), 1400);
    }).then(ctrl => controls = ctrl);

    return () => { if (controls) controls.stop(); };
  }, [add, toast]);

  // ── Quick add ──────────────────────────────────────────────────────────────
  const handleQuickAdd = useCallback((product) => {
    add(product);
    toast(`✓ ${product.name}`);
  }, [add, toast]);

  // ── Save new product ───────────────────────────────────────────────────────
  const submitProduct = async (form) => {
    setModalLoading(true);
    try {
      const res = await axios.post(`${API}/products/`, {
        barcode: form.barcode, name: form.name,
        purchase_price: parseFloat(form.purchase_price),
        sale_price: parseFloat(form.sale_price),
        stock: parseInt(form.stock),
        supplier: form.supplier || null,
        expiration: form.expiration || null,
      });
      add({ ...res.data, sale_price: parseFloat(form.sale_price) });
      toast(`"${form.name}" registrado`);
      newProductCodeRef.current = null;
      setNewProductCode(null);
    } catch (err) {
      toast(err?.response?.data?.detail || "Error al guardar", "error");
    } finally { setModalLoading(false); }
  };

  // ── Checkout ───────────────────────────────────────────────────────────────
  const checkout = async () => {
    if (!cart.length) return;
    setCheckoutLoading(true);
    try {
      const dbItems = cart.filter(p => !p.barcode.startsWith("QUICK-"));
      const quickTotal = cart.filter(p => p.barcode.startsWith("QUICK-")).reduce((s, p) => s + p.sale_price * p.qty, 0);

      let serverTotal = 0;
      if (dbItems.length > 0) {
        const res = await axios.post(`${API}/sales/`, dbItems.map(p => ({ barcode: p.barcode, quantity: p.qty })));
        if (res.data.error) throw new Error(res.data.error);
        serverTotal = res.data.total;
      }

      setSuccessData({ total: serverTotal + quickTotal, unitCount });
      clear();
    } catch (err) {
      toast(err?.response?.data?.detail || err.message || "Error al procesar venta", "error");
    } finally { setCheckoutLoading(false); }
  };

  const scanColor = scannerStatus === "found" ? C.accent : scannerStatus === "unknown" ? C.warn : scannerStatus === "scanning" ? C.blue : C.border;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${C.bg};overflow:hidden}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
        input::placeholder{color:${C.t4}}
        @keyframes scanLine{0%,100%{top:10%}50%{top:82%}}
        @keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.35}}
      `}</style>

      <Toasts toasts={toasts} />
      {newProductCode && <NewProductModal barcode={newProductCode} onSave={submitProduct} onCancel={() => { newProductCodeRef.current = null; setNewProductCode(null); }} loading={modalLoading} />}
      {successData && <SuccessScreen total={successData.total} unitCount={successData.unitCount} onClose={() => setSuccessData(null)} />}

      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: C.t1 }}>SCAN<span style={{ color: C.accent }}>POS</span></span>
            <span style={{ ...mono, fontSize: 9, color: C.t3, letterSpacing: 3 }}>PUNTO DE VENTA</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {[["SKUs", cart.length], ["Unidades", unitCount], ["Total", `$${total.toFixed(2)}`]].map(([label, value]) => (
              <div key={label} style={{ textAlign: "right" }}>
                <span style={{ display: "block", ...mono, fontSize: 8, color: C.t3, letterSpacing: 2 }}>{label}</span>
                <span style={{ ...mono, fontSize: 14, color: label === "Total" ? C.accent : C.t1, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BODY — 3 columns */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "256px 1fr 356px", overflow: "hidden" }}>

          {/* COL 1: QUICK PRODUCTS */}
          <QuickPanel onAdd={handleQuickAdd} />

          {/* COL 2: SCANNER */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, padding: 28, gap: 16 }}>
            <div style={{ width: "100%", maxWidth: 480, position: "relative", border: `2px solid ${scanColor}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.3s, box-shadow 0.3s", boxShadow: `0 0 36px ${scanColor}18`, background: "#000", aspectRatio: "4/3" }}>
              <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} muted />

              {/* Scan line */}
              <div style={{ position: "absolute", left: "8%", width: "84%", height: 2, background: `linear-gradient(90deg,transparent,${C.accent},transparent)`, animation: "scanLine 2.4s ease-in-out infinite", boxShadow: `0 0 10px ${C.accent}` }} />

              {/* Corners */}
              {[
                { top: 10, left: 10, borderTop: `2px solid ${C.accent}`, borderLeft: `2px solid ${C.accent}` },
                { top: 10, right: 10, borderTop: `2px solid ${C.accent}`, borderRight: `2px solid ${C.accent}` },
                { bottom: 10, left: 10, borderBottom: `2px solid ${C.accent}`, borderLeft: `2px solid ${C.accent}` },
                { bottom: 10, right: 10, borderBottom: `2px solid ${C.accent}`, borderRight: `2px solid ${C.accent}` },
              ].map((s, i) => <div key={i} style={{ position: "absolute", width: 22, height: 22, ...s }} />)}

              {/* Status badge */}
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", padding: "5px 12px", borderRadius: 20 }}>
                <span style={{ ...mono, fontSize: 9, color: scanColor, letterSpacing: 2, animation: scannerStatus === "idle" ? "blink 2.4s infinite" : "none" }}>
                  {{ idle: "LISTO PARA ESCANEAR", scanning: "BUSCANDO...", found: "✓ ENCONTRADO", unknown: "⚠ NUEVO PRODUCTO" }[scannerStatus]}
                </span>
              </div>
            </div>

            <span style={{ ...mono, fontSize: 10, color: C.t3, letterSpacing: 1 }}>
              Usa el panel izquierdo para agregar productos sin escanear
            </span>
          </div>

          {/* COL 3: CART */}
          <div style={{ display: "flex", flexDirection: "column", background: C.surface, borderLeft: `1px solid ${C.border}` }}>
            {/* Cart header */}
            <div style={{ padding: "15px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, color: C.t1, letterSpacing: 1.5 }}>CARRITO</span>
              {cart.length > 0 && <span style={{ background: C.accent, color: "#000", ...mono, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{unitCount}</span>}
            </div>

            {/* Items */}
            <div style={{ flex: 1, overflowY: "auto", padding: "2px 18px" }}>
              {cart.length === 0
                ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
                    <span style={{ fontSize: 30, opacity: 0.12 }}>🛒</span>
                    <span style={{ ...mono, fontSize: 10, color: C.t4, letterSpacing: 2 }}>CARRITO VACÍO</span>
                  </div>
                : cart.map(item => <CartRow key={item.barcode} item={item} onInc={inc} onDec={dec} onDel={del} />)
              }
            </div>

            {/* Footer */}
            <div style={{ padding: "13px 18px 18px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
              {cart.length > 0 && (
                <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                  {[["SUBTOTAL", `$${total.toFixed(2)}`], ["ARTÍCULOS", unitCount]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ ...mono, fontSize: 9, color: C.t3, letterSpacing: 1 }}>{k}</span>
                      <span style={{ ...mono, fontSize: 9, color: C.t3 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10, borderTop: `1px solid ${C.border}`, marginBottom: 13 }}>
                <span style={{ ...mono, fontSize: 10, color: C.t2, letterSpacing: 2 }}>TOTAL</span>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 34, fontWeight: 800, color: C.t1 }}>${total.toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <button onClick={checkout} disabled={!cart.length || checkoutLoading} style={{ width: "100%", padding: "14px", background: cart.length && !checkoutLoading ? C.accent : C.cardHi, border: "none", borderRadius: 9, color: cart.length && !checkoutLoading ? "#000" : C.t3, ...mono, fontWeight: 700, fontSize: 13, letterSpacing: 3, cursor: cart.length && !checkoutLoading ? "pointer" : "not-allowed", transition: "all 0.18s" }}>
                  {checkoutLoading ? "PROCESANDO..." : "COBRAR"}
                </button>
                <button onClick={clear} disabled={!cart.length} style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${C.borderHi}`, borderRadius: 9, color: cart.length ? C.t2 : C.t4, ...mono, fontSize: 11, letterSpacing: 2, cursor: cart.length ? "pointer" : "not-allowed" }}>
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}