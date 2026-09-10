"use client";

/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

type Category = "Todos" | "Cervejas" | "Refrigerantes" | "Gelo" | "Energéticos" | "Petiscos";
type Fulfillment = "delivery" | "pickup";
type Payment = "pix" | "card" | "cash";
type CardType = "credit" | "debit";
type Cart = Record<number, number>;
type CartUpdater = Cart | ((current: Cart) => Cart);

type Product = {
  id: number;
  name: string;
  detail: string;
  category: Exclude<Category, "Todos">;
  price: number;
  oldPrice?: number;
  badge?: string;
  image: string;
  isAlcoholic?: boolean;
};

type OrderDraft = {
  number: string;
  customerName: string;
  fulfillmentLabel: string;
  message: string;
  total: number;
  whatsappUrl: string;
  directToStore: boolean;
};

const DELIVERY_FEE = 6.99;
const FREE_DELIVERY_AT = 80;
const COUPON_MINIMUM = 35;
const COUPON_VALUE = 5;
const COUPON_CODE = "TOCA5";
const CART_STORAGE_KEY = "capivara-cart-v2";
const CART_CHANGE_EVENT = "capivara-cart-change";
const EMPTY_CART_SNAPSHOT = "{}";
const FOCUSABLE_ELEMENTS = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const storeWhatsAppNumber = "5551998842742";
let inMemoryCartSnapshot = EMPTY_CART_SNAPSHOT;

const categories: { name: Category; icon: string }[] = [
  { name: "Todos", icon: "✦" },
  { name: "Cervejas", icon: "🍺" },
  { name: "Refrigerantes", icon: "🥤" },
  { name: "Gelo", icon: "🧊" },
  { name: "Energéticos", icon: "⚡" },
  { name: "Petiscos", icon: "🍿" },
];

const products: Product[] = [
  { id: 1, name: "Heineken", detail: "Long neck 330ml • gelada", category: "Cervejas", price: 8.99, oldPrice: 9.99, badge: "premium", image: "/catalog/marcas/heineken-long-neck.webp", isAlcoholic: true },
  { id: 2, name: "Brahma Duplo Malte", detail: "Lata 350ml • gelada", category: "Cervejas", price: 4.99, badge: "mais pedida", image: "/catalog/marcas/brahma-duplo-malte.webp", isAlcoholic: true },
  { id: 3, name: "Budweiser", detail: "Lata 350ml • gelada", category: "Cervejas", price: 5.49, image: "/catalog/marcas/budweiser-350.webp", isAlcoholic: true },
  { id: 4, name: "Stella Artois", detail: "Long neck 330ml • gelada", category: "Cervejas", price: 7.99, image: "/catalog/marcas/stella-artois.webp", isAlcoholic: true },
  { id: 5, name: "Amstel", detail: "Lata 350ml • gelada", category: "Cervejas", price: 4.49, image: "/catalog/marcas/amstel-350.webp", isAlcoholic: true },
  { id: 6, name: "Corona Extra", detail: "Long neck 330ml • gelada", category: "Cervejas", price: 8.99, image: "/catalog/marcas/corona-extra.webp", isAlcoholic: true },
  { id: 7, name: "Combo da Toca", detail: "6 Brahma + 6 Amstel + gelo 5kg", category: "Cervejas", price: 59.9, oldPrice: 68.88, badge: "combo", image: "/catalog/marcas/combo-da-toca.webp", isAlcoholic: true },
  { id: 8, name: "Coca-Cola Original", detail: "Garrafa PET 2 litros", category: "Refrigerantes", price: 11.99, badge: "clássica", image: "/catalog/marcas/coca-cola-2l.webp" },
  { id: 9, name: "Coca-Cola Sem Açúcar", detail: "Garrafa PET 2 litros", category: "Refrigerantes", price: 11.99, image: "/catalog/marcas/coca-cola-zero-2l.webp" },
  { id: 10, name: "Guaraná Antarctica", detail: "Garrafa PET 2 litros", category: "Refrigerantes", price: 9.99, image: "/catalog/marcas/guarana-antarctica-2l.webp" },
  { id: 11, name: "Pepsi", detail: "Garrafa PET 2 litros", category: "Refrigerantes", price: 8.99, image: "/catalog/marcas/pepsi-2l.webp" },
  { id: 12, name: "Monster Energy", detail: "Lata 473ml", category: "Energéticos", price: 11.99, badge: "473ml", image: "/catalog/marcas/monster-473.webp" },
  { id: 13, name: "Red Bull", detail: "Lata 250ml", category: "Energéticos", price: 10.99, image: "/catalog/marcas/red-bull-250.webp" },
  { id: 14, name: "Gelo em Cubos", detail: "Pacote 5kg", category: "Gelo", price: 12, image: "/catalog/marcas/gelo-5kg.webp" },
  { id: 15, name: "Amendoim Japonês Dori", detail: "Pacote 100g", category: "Petiscos", price: 6.99, image: "/catalog/marcas/dori-amendoim.webp" },
  { id: 16, name: "Ruffles Original", detail: "Pacote 76g", category: "Petiscos", price: 9.99, image: "/catalog/marcas/ruffles-original.webp" },
];

const productIds = new Set(products.map((product) => product.id));
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function parseCart(snapshot: string | null): Cart {
  if (!snapshot) return {};

  try {
    const parsed: unknown = JSON.parse(snapshot);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.entries(parsed).reduce<Cart>((validCart, [key, value]) => {
      const id = Number(key);
      if (productIds.has(id) && typeof value === "number" && Number.isFinite(value) && value > 0) {
        validCart[id] = Math.min(99, Math.floor(value));
      }
      return validCart;
    }, {});
  } catch {
    return {};
  }
}

function getCartSnapshot() {
  if (typeof window === "undefined") return EMPTY_CART_SNAPSHOT;

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (stored) inMemoryCartSnapshot = stored;
    return stored ?? inMemoryCartSnapshot;
  } catch {
    return inMemoryCartSnapshot;
  }
}

function getServerCartSnapshot() {
  return EMPTY_CART_SNAPSHOT;
}

function subscribeToCart(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CART_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CART_CHANGE_EVENT, onStoreChange);
  };
}

async function copyText(text: string) {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ProductPhoto({ product, compact = false }: { product: Product; compact?: boolean }) {
  return (
    <img
      className={compact ? "product-photo compact" : "product-photo"}
      src={product.image}
      alt={product.name}
      loading="lazy"
      decoding="async"
    />
  );
}

function Logo() {
  return (
    <span className="brand" aria-label="Capivara Beer">
      <span className="brand-mark" aria-hidden="true">C</span>
      <span className="brand-copy"><strong>capivara</strong><small>BEER & CONVENIÊNCIA</small></span>
    </span>
  );
}

function FulfillmentToggle({ value, onChange, compact = false }: { value: Fulfillment; onChange: (value: Fulfillment) => void; compact?: boolean }) {
  return (
    <div className={`fulfillment-options ${compact ? "compact" : ""}`} role="group" aria-label="Forma de receber o pedido">
      <button className={value === "delivery" ? "selected" : ""} type="button" aria-pressed={value === "delivery"} onClick={() => onChange("delivery")}>
        <span aria-hidden="true">🛵</span><b>Entrega<small>na sua porta</small></b><i aria-hidden="true">✓</i>
      </button>
      <button className={value === "pickup" ? "selected" : ""} type="button" aria-pressed={value === "pickup"} onClick={() => onChange("pickup")}>
        <span aria-hidden="true">🛍️</span><b>Retirada<small>sem taxa</small></b><i aria-hidden="true">✓</i>
      </button>
    </div>
  );
}

export default function Home() {
  const cartSnapshot = useSyncExternalStore(subscribeToCart, getCartSnapshot, getServerCartSnapshot);
  const cart = useMemo(() => parseCart(cartSnapshot), [cartSnapshot]);
  const [category, setCategory] = useState<Category>("Todos");
  const [query, setQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [payment, setPayment] = useState<Payment>("pix");
  const [cardType, setCardType] = useState<CardType>("credit");
  const [favorites, setFavorites] = useState<number[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState("");
  const [couponSaved, setCouponSaved] = useState(false);
  const [orderDraft, setOrderDraft] = useState<OrderDraft | null>(null);
  const [orderCopied, setOrderCopied] = useState(false);
  const cartDialogRef = useRef<HTMLElement>(null);
  const checkoutDialogRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const setCart = useCallback((updater: CartUpdater) => {
    const current = parseCart(getCartSnapshot());
    const next = typeof updater === "function" ? updater(current) : updater;
    const sanitized = parseCart(JSON.stringify(next));
    inMemoryCartSnapshot = JSON.stringify(sanitized);

    try {
      window.localStorage.setItem(CART_STORAGE_KEY, inMemoryCartSnapshot);
    } catch {
      // The in-memory snapshot keeps the cart responsive in private browsing.
    }
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    const isLocked = cartOpen || checkoutOpen;
    document.body.classList.toggle("no-scroll", isLocked);

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (checkoutOpen) setCheckoutOpen(false);
      else setCartOpen(false);
    };

    if (isLocked) window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("no-scroll");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [cartOpen, checkoutOpen]);

  useEffect(() => {
    const activeDialog = checkoutOpen ? checkoutDialogRef.current : cartOpen ? cartDialogRef.current : null;

    if (!activeDialog) {
      openerRef.current?.focus();
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      if (!activeDialog.contains(document.activeElement)) {
        activeDialog.querySelector<HTMLElement>(FOCUSABLE_ELEMENTS)?.focus();
      }
    });

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", trapFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", trapFocus);
    };
  }, [cartOpen, checkoutOpen, orderDraft]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter((product) => {
      const inCategory = category === "Todos" || product.category === category;
      const matches = !normalized || `${product.name} ${product.detail} ${product.category}`.toLocaleLowerCase("pt-BR").includes(normalized);
      return inCategory && matches;
    });
  }, [category, query]);

  const cartItems = useMemo(() => products.filter((product) => (cart[product.id] ?? 0) > 0), [cart]);
  const cartCount = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);
  const subtotal = useMemo(() => cartItems.reduce((sum, product) => sum + product.price * cart[product.id], 0), [cart, cartItems]);
  const couponDiscount = couponApplied && subtotal >= COUPON_MINIMUM ? COUPON_VALUE : 0;
  const deliveryFee = subtotal > 0 && fulfillment === "delivery" && subtotal < FREE_DELIVERY_AT ? DELIVERY_FEE : 0;
  const total = Math.max(0, subtotal - couponDiscount) + deliveryFee;
  const freeDeliveryProgress = Math.min(100, (subtotal / FREE_DELIVERY_AT) * 100);
  const hasAlcohol = cartItems.some((product) => product.isAlcoholic);

  const openCart = () => {
    if (!cartOpen && !checkoutOpen) openerRef.current = document.activeElement as HTMLElement | null;
    setCartOpen(true);
  };

  const addToCart = (id: number) => setCart((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));

  const updateQuantity = (id: number, delta: number) => setCart((current) => {
    const nextQuantity = Math.max(0, (current[id] ?? 0) + delta);
    const updated = { ...current, [id]: nextQuantity };
    if (nextQuantity === 0) delete updated[id];
    return updated;
  });

  const toggleFavorite = (id: number) => {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const addCombo = () => {
    addToCart(7);
    openCart();
  };

  const saveCoupon = async () => {
    setCouponInput(COUPON_CODE);
    setCouponFeedback(subtotal >= COUPON_MINIMUM ? "Cupom pronto para aplicar no carrinho." : `Cupom salvo. O desconto entra a partir de ${money.format(COUPON_MINIMUM)}.`);
    setCouponSaved(true);
    await copyText(COUPON_CODE);
    window.setTimeout(() => setCouponSaved(false), 1800);
  };

  const applyCoupon = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = couponInput.trim().toUpperCase();

    if (normalized !== COUPON_CODE) {
      setCouponApplied(false);
      setCouponFeedback("Cupom não encontrado. Confira o código e tente de novo.");
      return;
    }

    if (subtotal < COUPON_MINIMUM) {
      setCouponApplied(true);
      setCouponFeedback(`Cupom salvo. Faltam ${money.format(COUPON_MINIMUM - subtotal)} para liberar o desconto.`);
      return;
    }

    setCouponApplied(true);
    setCouponFeedback(`${COUPON_CODE} aplicado: ${money.format(COUPON_VALUE)} de desconto.`);
  };

  const startCheckout = () => {
    if (cartItems.length === 0) return;
    setCartOpen(false);
    setOrderDraft(null);
    setOrderCopied(false);
    setCheckoutOpen(true);
  };

  const finishCheckout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cartItems.length === 0) {
      setCheckoutOpen(false);
      setCartOpen(true);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const field = (name: string) => String(formData.get(name) ?? "").trim();
    const number = `CB${Date.now().toString().slice(-6)}`;
    const customerName = field("name");
    const fulfillmentLabel = fulfillment === "delivery" ? "Entrega" : "Retirada";
    const paymentDescription = payment === "pix"
      ? "Pix (dados confirmados no WhatsApp)"
      : payment === "card"
        ? `Cartão de ${cardType === "credit" ? "crédito" : "débito"}`
        : `Dinheiro${field("change") ? ` — troco para ${field("change")}` : " — sem troco informado"}`;
    const address = fulfillment === "delivery"
      ? `${field("street")}, ${field("addressNumber")} — ${field("neighborhood")}, ${field("city")}/${field("state")} — CEP ${field("cep")}${field("complement") ? ` — ${field("complement")}` : ""}`
      : "Retirada na loja — endereço e horário serão confirmados no WhatsApp";
    const itemLines = cartItems.map((product) => `• ${cart[product.id]}x ${product.name} — ${money.format(product.price * cart[product.id])}`);
    const message = [
      `*Pedido ${number} — Capivara Beer*`,
      `Cliente: ${customerName}`,
      `WhatsApp: ${field("phone")}`,
      "",
      "*Itens*",
      ...itemLines,
      "",
      `Subtotal: ${money.format(subtotal)}`,
      couponDiscount > 0 ? `Cupom ${COUPON_CODE}: -${money.format(couponDiscount)}` : "",
      fulfillment === "delivery" ? `Entrega: ${deliveryFee === 0 ? "grátis" : money.format(deliveryFee)}` : "Retirada: sem taxa",
      `*Total: ${money.format(total)}*`,
      "",
      `Forma de receber: ${fulfillmentLabel}`,
      `Destino: ${address}`,
      `Pagamento: ${paymentDescription}`,
      field("notes") ? `Observações: ${field("notes")}` : "",
      hasAlcohol ? "Pedido com bebida alcoólica: documento 18+ será conferido." : "",
      "",
      "Por favor, confirme disponibilidade, área de entrega e prazo.",
    ].filter(Boolean).join("\n");

    setOrderDraft({
      number,
      customerName,
      fulfillmentLabel,
      message,
      total,
      whatsappUrl: storeWhatsAppNumber
        ? `https://wa.me/${storeWhatsAppNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`,
      directToStore: Boolean(storeWhatsAppNumber),
    });
  };

  const openWhatsApp = () => {
    if (!orderDraft) return;
    window.open(orderDraft.whatsappUrl, "_blank", "noopener,noreferrer");
    void copyText(orderDraft.message);
  };

  const copyOrder = async () => {
    if (!orderDraft) return;
    const copied = await copyText(orderDraft.message);
    setOrderCopied(copied);
  };

  const finishAndClearCart = () => {
    setCart({});
    setCheckoutOpen(false);
    setOrderDraft(null);
    setCouponInput("");
    setCouponApplied(false);
    setCouponFeedback("");
  };

  return (
    <main>
      <div className="top-note"><span className="status-dot" /><span>Entrega ou retirada</span><span className="note-divider" /><span>Pedidos até 01h</span></div>

      <header className="site-header">
        <a href="#inicio" aria-label="Capivara Beer - início"><Logo /></a>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <a href="#promocoes">Promoções</a><a href="#catalogo">Bebidas</a><a href="#entrega">Entrega</a>
        </nav>
        <button className="cart-trigger" type="button" onClick={openCart} aria-label={`Abrir carrinho com ${cartCount} ${cartCount === 1 ? "item" : "itens"}`}>
          <span className="bag-icon" aria-hidden="true">▣</span><span className="cart-label">Carrinho</span><span className="cart-count">{cartCount}</span>
        </button>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-glow" />
        <div className="hero-content">
          <span className="eyebrow"><span>●</span> Chegou no bairro</span>
          <h1>Seu rolê<br />não pode <em>secar.</em></h1>
          <p>Marcas conhecidas, bebida gelada, petiscos e aquele gelo salvador. Peça para entregar ou retire na toca.</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#catalogo">Ver bebidas <span aria-hidden="true">→</span></a>
            <span className="delivery-pill"><span className="pin-icon" aria-hidden="true">⌖</span><span><small>Entrega estimada</small><strong>25–40 min</strong></span></span>
          </div>
          <div className="hero-proof"><span className="proof-faces" aria-hidden="true"><i>🧊</i><i>🍺</i><i>🥤</i></span><span><b>Seu pedido do seu jeito</b><small>entrega ou retirada</small></span></div>
        </div>
        <div className="hero-art" role="img" aria-label="Capivara ao lado de um cooler com bebidas geladas" />
        <span className="hero-sticker"><b>tá gelada!</b><small>pode pedir</small></span>
      </section>

      <section className="promo-ticker" aria-label="Vantagens da Capivara Beer">
        <div className="ticker-track">
          {[0, 1].map((set) => <div className="ticker-set" aria-hidden={set === 1} key={set}><span>◆ ENTREGA RÁPIDA</span><i>✦</i><span>◆ BEBIDA TRINCANDO</span><i>✦</i><span>◆ COMBOS DA TOCA</span><i>✦</i><span>◆ CUPOM NO CARRINHO</span><i>✦</i></div>)}
        </div>
      </section>

      <section className="catalog-preview" id="catalogo">
        <div className="section-heading">
          <div><span className="section-kicker">marcas que todo mundo conhece</span><h2>Escolha sem pressa.<br /><em>A gente entrega rápido.</em></h2></div>
          <span className="catalog-count">{visibleProducts.length} produtos</span>
        </div>

        <div className="catalog-tools">
          <div className="category-row" aria-label="Categorias do catálogo">
            {categories.map((item) => <button className={`category ${category === item.name ? "active" : ""}`} type="button" key={item.name} onClick={() => setCategory(item.name)}><span>{item.icon}</span> {item.name}</button>)}
          </div>
          <label className="search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na toca..." aria-label="Buscar produtos" /></label>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="product-grid" id="catalogo-completo">
            {visibleProducts.map((product, index) => (
              <article className="product-card" key={product.id} style={{ "--delay": `${Math.min(index, 7) * 65}ms` } as CSSProperties}>
                <div className="product-visual">
                  {product.badge ? <span className="product-badge">{product.badge}</span> : null}
                  {product.isAlcoholic ? <span className="alcoholic-note">18+</span> : null}
                  <button className={`favorite ${favorites.includes(product.id) ? "active" : ""}`} aria-label={`${favorites.includes(product.id) ? "Remover" : "Adicionar"} ${product.name} ${favorites.includes(product.id) ? "dos" : "aos"} favoritos`} type="button" onClick={() => toggleFavorite(product.id)}>{favorites.includes(product.id) ? "♥" : "♡"}</button>
                  <ProductPhoto product={product} />
                </div>
                <div className="product-info">
                  <p className="product-detail">{product.detail}</p><h3>{product.name}</h3>
                  <div className="product-buy-row"><div className="price-block">{product.oldPrice ? <del>{money.format(product.oldPrice)}</del> : null}<strong>{money.format(product.price)}</strong></div>
                    {(cart[product.id] ?? 0) > 0 ? (
                      <div className="inline-quantity" aria-label={`Quantidade de ${product.name}`}><button type="button" onClick={() => updateQuantity(product.id, -1)} aria-label={`Remover uma unidade de ${product.name}`}>−</button><b>{cart[product.id]}</b><button type="button" onClick={() => updateQuantity(product.id, 1)} aria-label={`Adicionar mais uma unidade de ${product.name}`}>+</button></div>
                    ) : <button className="add-button" type="button" onClick={() => addToCart(product.id)} aria-label={`Adicionar ${product.name} ao carrinho`}><span>+</span></button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : <div className="empty-search"><span>🦫</span><h3>A capivara procurou em toda a toca...</h3><p>Nenhum produto encontrado. Tente buscar outro nome.</p><button type="button" onClick={() => { setQuery(""); setCategory("Todos"); }}>Limpar busca</button></div>}
      </section>

      <section className="promo-cards" id="promocoes">
        <article className="big-promo">
          <div className="promo-image" role="img" aria-label="Balde de gelo com bebidas variadas" />
          <div className="promo-copy"><span>COMBO DA SEMANA</span><h2>A resenha<br />já vem <em>pronta.</em></h2><p>6 Brahma + 6 Amstel + gelo de 5kg</p><strong><small>por</small> R$ 59,90</strong><button type="button" onClick={addCombo}>Adicionar o combo <span>→</span></button></div>
        </article>
        <article className="coupon-card">
          <span className="coupon-top">CUPOM DA TOCA</span><div className="coupon-icon">%</div><h3>R$ 5 de desconto</h3><p>Use o cupom em compras a partir de R$ 35.</p><button type="button" onClick={saveCoupon}>TOCA5 <span>{couponSaved ? "salvo!" : "salvar"}</span></button><small>{couponFeedback || "O cupom é aplicado no carrinho"}</small>
        </article>
      </section>

      <section className="delivery-section" id="entrega">
        <div className="delivery-copy"><span className="section-kicker">do clique até a sua porta</span><h2>A Capivara não<br />deixa ninguém <em>na sede.</em></h2><p>Escolha entrega ou retirada, informe os dados e gere uma mensagem completa. Disponibilidade, endereço atendido e prazo são confirmados no WhatsApp.</p><div className="delivery-stats"><span><b>25–40</b><small>minutos estimados</small></span><span><b>R$ 80</b><small>libera entrega grátis</small></span></div></div>
        <div className="delivery-steps">
          <article><span className="step-number">01</span><div><h3>Monte seu pedido</h3><p>Escolha as bebidas, o gelo e os petiscos.</p></div><i>✓</i></article>
          <article><span className="step-number">02</span><div><h3>Entrega ou retirada</h3><p>Informe o endereço só quando precisar de entrega.</p></div><i>⌖</i></article>
          <article><span className="step-number">03</span><div><h3>Envie pelo WhatsApp</h3><p>Revise a mensagem e peça a confirmação da loja.</p></div><i>→</i></article>
        </div>
      </section>

      <section className="neighborhood-note"><span>“</span><p>Uma conveniência com cara de bairro,<br />pedido simples e bebida sempre gelada.</p><span>”</span></section>

      <footer>
        <div className="footer-main"><div className="footer-brand"><div><Logo /><p>Sua nova parada para salvar o rolê.</p><span className="age-pill">18+ • beba com responsabilidade</span></div><img className="footer-mascot" src="/capivara-beer-mascot.webp" alt="Mascote entregador da Capivara Beer" width="175" height="245" loading="lazy" decoding="async" /></div><div className="footer-links"><span><b>CAPIVARA BEER</b><a href="#catalogo">Catálogo</a><a href="#promocoes">Promoções</a><a href="#entrega">Como funciona</a></span><span><b>ATENDIMENTO</b><a href={`https://wa.me/${storeWhatsAppNumber}`} target="_blank" rel="noreferrer">WhatsApp: (51) 99884-2742</a><span className="footer-placeholder">Instagram <i>em breve</i></span><a href="#entrega">Entrega e retirada</a></span><span><b>HORÁRIOS</b><p>Seg–Qui: 16h–00h<br />Sex–Sáb: 14h–01h<br />Dom: 14h–23h</p></span></div></div>
        <div className="footer-bottom"><span>© 2026 Capivara Beer</span><span>Se beber, não dirija.</span></div>
      </footer>

      {cartCount > 0 ? <button className="mobile-cart-bar" type="button" onClick={openCart}><span><b>{cartCount}</b> {cartCount === 1 ? "item" : "itens"}</span><strong>Ver carrinho</strong><span>{money.format(total)}</span></button> : null}

      <div className={`drawer-shell ${cartOpen ? "is-open" : ""}`} aria-hidden={!cartOpen}>
        <button className="drawer-backdrop" type="button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho" />
        <aside ref={cartDialogRef} className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" inert={!cartOpen}>
          <div className="drawer-header"><div><span className="section-kicker">a sua toca</span><h2 id="cart-title">Seu carrinho</h2></div><button type="button" onClick={() => setCartOpen(false)} aria-label="Fechar carrinho">×</button></div>
          {cartItems.length === 0 ? <div className="empty-cart"><span>🦫</span><h3>A toca está vazia</h3><p>Adicione suas bebidas favoritas e volte aqui.</p><button type="button" onClick={() => setCartOpen(false)}>Escolher bebidas</button></div> : <>
            {fulfillment === "delivery" ? <div className="free-delivery"><div><span>{subtotal >= FREE_DELIVERY_AT ? "Entrega grátis liberada!" : `Faltam ${money.format(Math.max(0, FREE_DELIVERY_AT - subtotal))} para entrega grátis`}</span><b>{freeDeliveryProgress.toFixed(0)}%</b></div><i><em style={{ width: `${freeDeliveryProgress}%` }} /></i></div> : <div className="pickup-info"><span aria-hidden="true">🛍️</span><b>Retirada escolhida</b><small>Sem taxa de entrega</small></div>}
            <div className="cart-list">{cartItems.map((item) => <article className="cart-item" key={item.id}><div className="cart-thumb"><ProductPhoto product={item} compact /></div><div className="cart-item-copy"><span>{item.detail}</span><h3>{item.name}</h3><strong>{money.format(item.price * cart[item.id])}</strong></div><div className="cart-quantity"><button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Remover uma unidade de ${item.name}`}>−</button><b>{cart[item.id]}</b><button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Adicionar mais uma unidade de ${item.name}`}>+</button></div></article>)}</div>
            <div className="cart-summary">
              <FulfillmentToggle value={fulfillment} onChange={setFulfillment} compact />
              <form className="coupon-form" onSubmit={applyCoupon}><label htmlFor="coupon">Cupom</label><div><input id="coupon" value={couponInput} onChange={(event) => { setCouponInput(event.target.value.toUpperCase()); setCouponApplied(false); setCouponFeedback(""); }} placeholder="Digite o código" maxLength={12} /><button type="submit">Aplicar</button></div><small className={couponDiscount > 0 ? "success" : ""} role="status">{couponApplied ? couponDiscount > 0 ? `${COUPON_CODE} aplicado: ${money.format(COUPON_VALUE)} de desconto.` : `Cupom salvo: faltam ${money.format(COUPON_MINIMUM - subtotal)}.` : couponFeedback}</small></form>
              <div className="summary-line"><span>Subtotal</span><b>{money.format(subtotal)}</b></div>
              {couponDiscount > 0 ? <div className="summary-line discount"><span>Cupom {COUPON_CODE}</span><b>− {money.format(couponDiscount)}</b></div> : null}
              <div className="summary-line"><span>{fulfillment === "delivery" ? "Entrega" : "Retirada"}</span><b className={deliveryFee === 0 ? "free" : ""}>{fulfillment === "pickup" ? "sem taxa" : deliveryFee === 0 ? "grátis" : money.format(deliveryFee)}</b></div>
              <div className="summary-line summary-total"><span>Total</span><strong>{money.format(total)}</strong></div>
              <button className="continue-order" type="button" onClick={startCheckout}>Continuar pedido <span>→</span></button><small className="confirmation-note">Disponibilidade, área e prazo são confirmados no WhatsApp.</small>
            </div>
          </>}
        </aside>
      </div>

      {checkoutOpen ? <div className="checkout-shell" role="dialog" aria-modal="true" aria-label="Finalizar pedido">
        <button className="drawer-backdrop" type="button" onClick={() => setCheckoutOpen(false)} aria-label="Fechar finalização" />
        <section ref={checkoutDialogRef} className="checkout-modal">
          {!orderDraft ? <>
            <div className="checkout-header"><button type="button" onClick={() => { setCheckoutOpen(false); setCartOpen(true); }} aria-label="Voltar ao carrinho">←</button><div><span className="section-kicker">último passo</span><h2 id="checkout-title">Como você quer receber?</h2></div><button type="button" onClick={() => setCheckoutOpen(false)} aria-label="Fechar">×</button></div>
            <form onSubmit={finishCheckout}>
              <div className="checkout-layout">
                <div className="checkout-fields">
                  <div className="form-section"><h3><span>1</span> Entrega ou retirada</h3><FulfillmentToggle value={fulfillment} onChange={setFulfillment} /></div>
                  <div className="form-section"><h3><span>2</span> Seus dados</h3><div className="form-grid"><label className="wide">Nome completo<input name="name" autoComplete="name" required placeholder="Como podemos chamar você?" /></label><label className="wide">WhatsApp<input name="phone" autoComplete="tel" inputMode="tel" pattern="[0-9()+ -]{10,20}" title="Use somente números, espaços, parênteses, + ou -" minLength={10} maxLength={20} required placeholder="(51) 99999-9999" /></label></div></div>
                  {fulfillment === "delivery" ? <div className="form-section"><h3><span>3</span> Endereço de entrega</h3><div className="form-grid"><label>CEP<input name="cep" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}-?[0-9]{3}" title="Use um CEP com 8 números" required placeholder="00000-000" /></label><label>Número<input name="addressNumber" required placeholder="123" /></label><label className="wide">Rua / Avenida<input name="street" autoComplete="address-line1" required placeholder="Nome da rua" /></label><label>Bairro<input name="neighborhood" required placeholder="Seu bairro" /></label><label>Cidade<input name="city" autoComplete="address-level2" required placeholder="Sua cidade" /></label><label>UF<input name="state" autoComplete="address-level1" required maxLength={2} placeholder="RS" /></label><label>Complemento <small>(opcional)</small><input name="complement" autoComplete="address-line2" placeholder="Apto, bloco, referência" /></label></div><p className="area-note">A taxa exibida considera a regra atual da loja. O atendimento do endereço é confirmado antes do envio.</p></div> : <div className="form-section pickup-confirmation"><h3><span>3</span> Retirada na loja</h3><p>Sem taxa. O endereço e o horário exato para retirada serão confirmados na conversa do WhatsApp.</p></div>}
                  <div className="form-section"><h3><span>4</span> Pagamento</h3><div className="payment-options">
                    <label className={payment === "pix" ? "selected" : ""}><input type="radio" name="payment" value="pix" checked={payment === "pix"} onChange={() => setPayment("pix")} /><span>◇</span><b>Pix<small>confirmar dados</small></b><i>✓</i></label>
                    <label className={payment === "card" ? "selected" : ""}><input type="radio" name="payment" value="card" checked={payment === "card"} onChange={() => setPayment("card")} /><span>▤</span><b>Cartão<small>ao receber</small></b><i>✓</i></label>
                    <label className={payment === "cash" ? "selected" : ""}><input type="radio" name="payment" value="cash" checked={payment === "cash"} onChange={() => setPayment("cash")} /><span>$</span><b>Dinheiro<small>avise o troco</small></b><i>✓</i></label>
                  </div>
                  {payment === "card" ? <label className="conditional-field">Tipo do cartão<select name="cardType" value={cardType} onChange={(event) => setCardType(event.target.value as CardType)}><option value="credit">Crédito</option><option value="debit">Débito</option></select></label> : null}
                  {payment === "cash" ? <label className="conditional-field">Precisa de troco? <small>(opcional)</small><input name="change" inputMode="decimal" placeholder="Ex.: troco para R$ 100" /></label> : null}
                  </div>
                  <div className="form-section notes-section"><h3><span>5</span> Observações</h3><label>Recado para o pedido <small>(opcional)</small><textarea name="notes" rows={3} maxLength={240} placeholder="Ex.: tocar o interfone, entregar sem gelo extra..." /></label></div>
                  {hasAlcohol ? <label className="age-confirmation"><input type="checkbox" name="adult" required /><span>Confirmo que sou maior de 18 anos e apresentarei documento na entrega ou retirada.</span></label> : null}
                </div>

                <aside className="checkout-order-summary" aria-label="Resumo do pedido"><span className="section-kicker">revise antes de enviar</span><h3>Resumo da toca</h3><div className="checkout-order-items">{cartItems.map((item) => <div className="checkout-order-item" key={item.id}><span>{cart[item.id]}×</span><b>{item.name}</b><strong>{money.format(item.price * cart[item.id])}</strong></div>)}</div><div className="checkout-costs"><div><span>Subtotal</span><b>{money.format(subtotal)}</b></div>{couponDiscount > 0 ? <div className="discount"><span>Cupom {COUPON_CODE}</span><b>− {money.format(couponDiscount)}</b></div> : null}<div><span>{fulfillment === "delivery" ? "Entrega" : "Retirada"}</span><b>{fulfillment === "pickup" ? "sem taxa" : deliveryFee === 0 ? "grátis" : money.format(deliveryFee)}</b></div><div className="checkout-summary-total"><span>Total</span><strong>{money.format(total)}</strong></div></div><small>O pedido ainda não será enviado: você poderá revisar a mensagem antes de abrir o WhatsApp.</small></aside>
              </div>
              <div className="checkout-total"><span><small>Total do pedido</small><strong>{money.format(total)}</strong></span><button type="submit">Preparar pedido <span>→</span></button></div>
            </form>
          </> : <div className="order-success">
            <button className="success-close" type="button" onClick={() => setCheckoutOpen(false)} aria-label="Fechar">×</button>
            <div className="success-mark">↗</div><span className="section-kicker">pedido {orderDraft.number}</span><h2>Pronto para<br />enviar.</h2><p>O pedido de {orderDraft.customerName} <strong>ainda não foi enviado</strong>. {orderDraft.directToStore ? "Abra o WhatsApp, revise a conversa da loja e toque em enviar." : "Abra o WhatsApp, escolha a conversa da loja, revise e toque em enviar."}</p>
            <div className="order-ready-summary"><span><small>{orderDraft.fulfillmentLabel}</small><b>{money.format(orderDraft.total)}</b></span><i>{orderDraft.directToStore ? "Mensagem preenchida para a loja" : "Escolha o contato da loja no WhatsApp"}</i></div>
            <div className="order-actions"><button className="whatsapp-action" type="button" onClick={openWhatsApp}><span aria-hidden="true">◉</span> {orderDraft.directToStore ? "Abrir WhatsApp da loja" : "Abrir e escolher contato"}</button><button className="copy-action" type="button" onClick={copyOrder}>{orderCopied ? "Pedido copiado!" : "Copiar pedido"}</button></div>
            <button className="finish-order" type="button" onClick={finishAndClearCart}>Já enviei — finalizar e limpar carrinho</button><small className="success-note">Só use este botão depois de enviar a mensagem. A confirmação final vem da loja.</small>
          </div>}
        </section>
      </div> : null}
    </main>
  );
}
