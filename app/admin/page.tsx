"use client";

import { FormEvent, useMemo, useState } from "react";
import styles from "./admin.module.css";

type Category = "Cervejas" | "Refrigerantes" | "Gelo" | "Energéticos" | "Petiscos";
type Product = {
  id: number;
  name: string;
  detail: string;
  category: Category;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  image: string;
  active: boolean;
  isAlcoholic?: boolean;
  badge?: string;
};
type FinanceEntry = { id: number; type: "income" | "expense"; description: string; amount: number; date: string; category: string };
type Order = { id: string; customer: string; total: number; status: "Novo" | "Preparando" | "Saiu" | "Concluído" | "Cancelado"; payment: string; createdAt: string };

const PRODUCT_KEY = "capivara-admin-products-v1";
const FINANCE_KEY = "capivara-admin-finance-v1";
const ORDERS_KEY = "capivara-admin-orders-v1";

const initialProducts: Product[] = [
  { id: 1, name: "Heineken", detail: "Long neck 330ml • gelada", category: "Cervejas", price: 8.99, cost: 5.2, stock: 48, minStock: 12, image: "/catalog/marcas/heineken-long-neck.webp", active: true, isAlcoholic: true, badge: "premium" },
  { id: 2, name: "Brahma Duplo Malte", detail: "Lata 350ml • gelada", category: "Cervejas", price: 4.99, cost: 3.1, stock: 72, minStock: 18, image: "/catalog/marcas/brahma-duplo-malte.webp", active: true, isAlcoholic: true, badge: "mais pedida" },
  { id: 3, name: "Budweiser", detail: "Lata 350ml • gelada", category: "Cervejas", price: 5.49, cost: 3.4, stock: 36, minStock: 12, image: "/catalog/marcas/budweiser-350.webp", active: true, isAlcoholic: true },
  { id: 4, name: "Stella Artois", detail: "Long neck 330ml • gelada", category: "Cervejas", price: 7.99, cost: 4.9, stock: 24, minStock: 10, image: "/catalog/marcas/stella-artois.webp", active: true, isAlcoholic: true },
  { id: 8, name: "Coca-Cola Original", detail: "Garrafa PET 2 litros", category: "Refrigerantes", price: 11.99, cost: 7.2, stock: 19, minStock: 8, image: "/catalog/marcas/coca-cola-2l.webp", active: true },
  { id: 12, name: "Monster Energy", detail: "Lata 473ml", category: "Energéticos", price: 11.99, cost: 7.1, stock: 11, minStock: 8, image: "/catalog/marcas/monster-473.webp", active: true },
  { id: 14, name: "Gelo em Cubos", detail: "Pacote 5kg", category: "Gelo", price: 12, cost: 6.5, stock: 8, minStock: 10, image: "/catalog/marcas/gelo-5kg.webp", active: true },
  { id: 16, name: "Ruffles Original", detail: "Pacote 76g", category: "Petiscos", price: 9.99, cost: 5.8, stock: 14, minStock: 6, image: "/catalog/marcas/ruffles-original.webp", active: true },
];

const initialFinance: FinanceEntry[] = [
  { id: 1, type: "income", description: "Vendas balcão", amount: 842.5, date: new Date().toISOString().slice(0,10), category: "Vendas" },
  { id: 2, type: "expense", description: "Reposição de bebidas", amount: 326.8, date: new Date().toISOString().slice(0,10), category: "Estoque" },
  { id: 3, type: "expense", description: "Entrega / motoboy", amount: 94, date: new Date().toISOString().slice(0,10), category: "Logística" },
];

const initialOrders: Order[] = [
  { id: "CB1042", customer: "Cliente balcão", total: 78.7, status: "Novo", payment: "Pix", createdAt: "Hoje, 18:42" },
  { id: "CB1041", customer: "Marcos", total: 126.4, status: "Preparando", payment: "Cartão", createdAt: "Hoje, 18:21" },
  { id: "CB1040", customer: "Ana", total: 49.9, status: "Concluído", payment: "Dinheiro", createdAt: "Hoje, 17:56" },
];

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save<T>(key: string, value: T) { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event("capivara-admin-change")); }

export default function AdminPage() {
  const [section, setSection] = useState("dashboard");
  const [products, setProducts] = useState<Product[]>(() => load(PRODUCT_KEY, initialProducts));
  const [finance, setFinance] = useState<FinanceEntry[]>(() => load(FINANCE_KEY, initialFinance));
  const [orders, setOrders] = useState<Order[]>(() => load(ORDERS_KEY, initialOrders));
  const [productModal, setProductModal] = useState(false);
  const [financeModal, setFinanceModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [query, setQuery] = useState("");

  const revenue = finance.filter(x => x.type === "income").reduce((a,b) => a + b.amount, 0);
  const expenses = finance.filter(x => x.type === "expense").reduce((a,b) => a + b.amount, 0);
  const stockValue = products.reduce((sum,p) => sum + p.stock * p.cost, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);
  const potentialRevenue = products.reduce((sum,p) => sum + p.stock * p.price, 0);
  const margin = potentialRevenue ? ((potentialRevenue - stockValue) / potentialRevenue) * 100 : 0;
  const filtered = products.filter(p => (p.name + p.category).toLowerCase().includes(query.toLowerCase()));

  const updateProducts = (next: Product[]) => { setProducts(next); save(PRODUCT_KEY, next); };
  const updateFinance = (next: FinanceEntry[]) => { setFinance(next); save(FINANCE_KEY, next); };
  const updateOrders = (next: Order[]) => { setOrders(next); save(ORDERS_KEY, next); };

  const handleProduct = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next: Product = {
      id: editingProduct?.id ?? Date.now(),
      name: String(fd.get("name") || ""),
      detail: String(fd.get("detail") || ""),
      category: String(fd.get("category") || "Cervejas") as Category,
      price: Number(fd.get("price") || 0),
      cost: Number(fd.get("cost") || 0),
      stock: Number(fd.get("stock") || 0),
      minStock: Number(fd.get("minStock") || 0),
      image: String(fd.get("image") || "/capivara-beer-mascot.webp"),
      badge: String(fd.get("badge") || "") || undefined,
      active: fd.get("active") === "on",
      isAlcoholic: fd.get("alcohol") === "on",
    };
    const out = editingProduct ? products.map(p => p.id === next.id ? next : p) : [next, ...products];
    updateProducts(out); setProductModal(false); setEditingProduct(null);
  };

  const handleFinance = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    updateFinance([{ id: Date.now(), type: String(fd.get("type")) as "income"|"expense", description: String(fd.get("description")), amount: Number(fd.get("amount")), date: String(fd.get("date")), category: String(fd.get("category")) }, ...finance]);
    setFinanceModal(false);
  };

  const nav = [
    ["dashboard","Visão geral","⌂"], ["orders","Pedidos","▣"], ["products","Produtos","□"], ["stock","Estoque","▤"],
    ["finance","Financeiro","$"], ["customers","Clientes","◉"], ["coupons","Cupons","%"], ["settings","Configurações","⚙"]
  ];

  return <main className={styles.shell}>
    <aside className={styles.sidebar}>
      <a className={styles.brand} href="/"><span>CB</span><b>capivara<small>ADMIN</small></b></a>
      <nav>{nav.map(([id,label,icon]) => <button key={id} onClick={() => setSection(id)} className={section===id?styles.active:""}><i>{icon}</i>{label}{id==="orders"&&<em>{orders.filter(o=>o.status==="Novo").length}</em>}</button>)}</nav>
      <div className={styles.storeLink}><span>Loja online</span><b>Operando normalmente</b><a href="/" target="_blank">Abrir loja ↗</a></div>
    </aside>

    <section className={styles.content}>
      <header className={styles.header}><div><small>CAPIVARA BEER • PAINEL DE GESTÃO</small><h1>{nav.find(n=>n[0]===section)?.[1]}</h1></div><div className={styles.headerActions}><span className={styles.live}>● Loja online</span><button onClick={()=>{setEditingProduct(null);setProductModal(true)}}>+ Novo produto</button></div></header>

      {section==="dashboard" && <>
        <div className={styles.cards}>
          <article><span>Faturamento</span><strong>{money.format(revenue)}</strong><small>Entradas registradas</small></article>
          <article><span>Resultado líquido</span><strong>{money.format(revenue-expenses)}</strong><small>Receitas − despesas</small></article>
          <article><span>Valor em estoque</span><strong>{money.format(stockValue)}</strong><small>{products.reduce((a,p)=>a+p.stock,0)} unidades</small></article>
          <article><span>Margem potencial</span><strong>{margin.toFixed(1)}%</strong><small>sobre estoque atual</small></article>
        </div>
        <div className={styles.grid2}>
          <section className={styles.panel}><div className={styles.panelHead}><div><small>OPERAÇÃO</small><h2>Pedidos recentes</h2></div><button onClick={()=>setSection("orders")}>Ver todos</button></div>
            <div className={styles.orderList}>{orders.slice(0,5).map(o=><div key={o.id}><span><b>{o.id}</b><small>{o.customer} • {o.createdAt}</small></span><strong>{money.format(o.total)}</strong><em data-status={o.status}>{o.status}</em></div>)}</div>
          </section>
          <section className={styles.panel}><div className={styles.panelHead}><div><small>ATENÇÃO</small><h2>Estoque crítico</h2></div><button onClick={()=>setSection("stock")}>Abrir estoque</button></div>
            <div className={styles.stockList}>{lowStock.length?lowStock.map(p=><div key={p.id}><img src={p.image} alt=""/><span><b>{p.name}</b><small>Mínimo {p.minStock} un.</small></span><strong>{p.stock} un.</strong></div>):<p className={styles.empty}>Nenhum item abaixo do mínimo.</p>}</div>
          </section>
        </div>
        <section className={styles.panel}><div className={styles.panelHead}><div><small>FINANCEIRO</small><h2>Fluxo do dia</h2></div><button onClick={()=>setFinanceModal(true)}>+ Lançamento</button></div>
          <div className={styles.financeSummary}><div><span>Entradas</span><b className={styles.positive}>{money.format(revenue)}</b></div><div><span>Saídas</span><b className={styles.negative}>{money.format(expenses)}</b></div><div><span>Saldo</span><b>{money.format(revenue-expenses)}</b></div></div>
        </section>
      </>}

      {section==="products" && <section className={styles.panel}><div className={styles.toolbar}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar produto ou categoria..."/><button onClick={()=>{setEditingProduct(null);setProductModal(true)}}>+ Adicionar produto</button></div>
        <div className={styles.table}><div className={styles.th}><span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span>Status</span><span>Ações</span></div>{filtered.map(p=><div className={styles.tr} key={p.id}><span className={styles.productCell}><img src={p.image} alt=""/><b>{p.name}<small>{p.detail}</small></b></span><span>{p.category}</span><span><b>{money.format(p.price)}</b><small>Custo {money.format(p.cost)}</small></span><span className={p.stock<=p.minStock?styles.alert:""}>{p.stock} un.</span><span><button className={p.active?styles.statusOn:styles.statusOff} onClick={()=>updateProducts(products.map(x=>x.id===p.id?{...x,active:!x.active}:x))}>{p.active?"Ativo":"Pausado"}</button></span><span className={styles.rowActions}><button onClick={()=>{setEditingProduct(p);setProductModal(true)}}>Editar</button><button onClick={()=>confirm("Excluir produto?")&&updateProducts(products.filter(x=>x.id!==p.id))}>Excluir</button></span></div>)}</div>
      </section>}

      {section==="stock" && <section className={styles.panel}><div className={styles.panelHead}><div><small>CONTROLE DE ESTOQUE</small><h2>Inventário completo</h2></div><span className={styles.kpiMini}>{money.format(stockValue)} em custo</span></div>
        <div className={styles.table}><div className={styles.th}><span>Produto</span><span>Atual</span><span>Mínimo</span><span>Custo</span><span>Valor</span><span>Ajuste</span></div>{products.map(p=><div className={styles.tr} key={p.id}><span className={styles.productCell}><img src={p.image} alt=""/><b>{p.name}<small>{p.category}</small></b></span><span className={p.stock<=p.minStock?styles.alert:""}><b>{p.stock} un.</b></span><span>{p.minStock} un.</span><span>{money.format(p.cost)}</span><span>{money.format(p.cost*p.stock)}</span><span className={styles.qty}><button onClick={()=>updateProducts(products.map(x=>x.id===p.id?{...x,stock:Math.max(0,x.stock-1)}:x))}>−</button><button onClick={()=>updateProducts(products.map(x=>x.id===p.id?{...x,stock:x.stock+1}:x))}>+</button></span></div>)}</div>
      </section>}

      {section==="finance" && <><div className={styles.cards}><article><span>Entradas</span><strong>{money.format(revenue)}</strong></article><article><span>Saídas</span><strong>{money.format(expenses)}</strong></article><article><span>Saldo</span><strong>{money.format(revenue-expenses)}</strong></article><article><span>Estoque a preço de venda</span><strong>{money.format(potentialRevenue)}</strong></article></div>
        <section className={styles.panel}><div className={styles.panelHead}><div><small>CAIXA</small><h2>Lançamentos</h2></div><button onClick={()=>setFinanceModal(true)}>+ Novo lançamento</button></div><div className={styles.financeRows}>{finance.map(f=><div key={f.id}><span className={f.type==="income"?styles.incomeIcon:styles.expenseIcon}>{f.type==="income"?"↑":"↓"}</span><b>{f.description}<small>{f.category} • {new Date(f.date+"T12:00:00").toLocaleDateString("pt-BR")}</small></b><strong className={f.type==="income"?styles.positive:styles.negative}>{f.type==="income"?"+ ":"− "}{money.format(f.amount)}</strong><button onClick={()=>updateFinance(finance.filter(x=>x.id!==f.id))}>×</button></div>)}</div></section></>}

      {section==="orders" && <section className={styles.panel}><div className={styles.panelHead}><div><small>VENDAS</small><h2>Gestão de pedidos</h2></div></div><div className={styles.orderBoard}>{["Novo","Preparando","Saiu","Concluído"].map(status=><div key={status}><h3>{status}<span>{orders.filter(o=>o.status===status).length}</span></h3>{orders.filter(o=>o.status===status).map(o=><article key={o.id}><b>{o.id}</b><p>{o.customer}</p><strong>{money.format(o.total)}</strong><small>{o.payment} • {o.createdAt}</small><select value={o.status} onChange={e=>updateOrders(orders.map(x=>x.id===o.id?{...x,status:e.target.value as Order["status"]}:x))}>{["Novo","Preparando","Saiu","Concluído","Cancelado"].map(s=><option key={s}>{s}</option>)}</select></article>)}</div>)}</div></section>}

      {["customers","coupons","settings"].includes(section) && <section className={styles.panel}><div className={styles.placeholder}><span>{section==="customers"?"◉":section==="coupons"?"%":"⚙"}</span><h2>{section==="customers"?"Base de clientes":section==="coupons"?"Cupons e promoções":"Configurações da loja"}</h2><p>{section==="customers"?"Central para histórico, recorrência, ticket médio e contato dos clientes.":section==="coupons"?"Crie regras de desconto, valor mínimo, validade e limite de uso.":"Horários, WhatsApp, taxas, entrega grátis, formas de pagamento e dados da loja."}</p><button onClick={()=>alert("Módulo preparado para integração com banco de dados.")}>Configurar módulo</button></div></section>}
    </section>

    {productModal && <div className={styles.modalBackdrop} onMouseDown={()=>setProductModal(false)}><form className={styles.modal} onSubmit={handleProduct} onMouseDown={e=>e.stopPropagation()}><div className={styles.modalHead}><div><small>CATÁLOGO</small><h2>{editingProduct?"Editar produto":"Novo produto"}</h2></div><button type="button" onClick={()=>setProductModal(false)}>×</button></div>
      <div className={styles.formGrid}><label className={styles.wide}>Nome<input name="name" required defaultValue={editingProduct?.name}/></label><label className={styles.wide}>Descrição<input name="detail" required defaultValue={editingProduct?.detail}/></label><label>Categoria<select name="category" defaultValue={editingProduct?.category||"Cervejas"}>{["Cervejas","Refrigerantes","Gelo","Energéticos","Petiscos"].map(c=><option key={c}>{c}</option>)}</select></label><label>Preço de venda<input name="price" type="number" step=".01" required defaultValue={editingProduct?.price}/></label><label>Custo<input name="cost" type="number" step=".01" required defaultValue={editingProduct?.cost}/></label><label>Estoque atual<input name="stock" type="number" required defaultValue={editingProduct?.stock}/></label><label>Estoque mínimo<input name="minStock" type="number" required defaultValue={editingProduct?.minStock??5}/></label><label>Badge<input name="badge" defaultValue={editingProduct?.badge} placeholder="Ex.: oferta"/></label><label className={styles.wide}>Imagem / caminho<input name="image" defaultValue={editingProduct?.image} placeholder="/catalog/produto.webp"/></label></div>
      <div className={styles.checks}><label><input type="checkbox" name="active" defaultChecked={editingProduct?.active??true}/> Disponível na loja</label><label><input type="checkbox" name="alcohol" defaultChecked={editingProduct?.isAlcoholic}/> Bebida alcoólica 18+</label></div><button className={styles.save} type="submit">Salvar produto</button>
    </form></div>}

    {financeModal && <div className={styles.modalBackdrop} onMouseDown={()=>setFinanceModal(false)}><form className={styles.modal} onSubmit={handleFinance} onMouseDown={e=>e.stopPropagation()}><div className={styles.modalHead}><div><small>FINANCEIRO</small><h2>Novo lançamento</h2></div><button type="button" onClick={()=>setFinanceModal(false)}>×</button></div><div className={styles.formGrid}><label>Tipo<select name="type"><option value="income">Entrada</option><option value="expense">Saída</option></select></label><label>Categoria<input name="category" required placeholder="Vendas, estoque..."/></label><label className={styles.wide}>Descrição<input name="description" required/></label><label>Valor<input name="amount" type="number" step=".01" required/></label><label>Data<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0,10)}/></label></div><button className={styles.save} type="submit">Salvar lançamento</button></form></div>}
  </main>;
}
