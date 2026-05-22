import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  PlusCircle,
  FileText,
  Sparkles,
  AlertTriangle,
  Upload,
  Check,
  Loader2,
  Tag,
  Package,
  Clock,
  HelpCircle,
  CreditCard,
  TrendingUp,
  Pencil,
  X,
} from "lucide-react";
import {
  fetchProducts,
  fetchOrders,
  createProduct,
  importProductsCsv,
  getAiAssistedProduct,
  updateOrderStatus,
  updateProduct,
} from "@/lib/api";
import { Product } from "@/types/shop";
import { formatCLP } from "@/lib/format";
import { FALLBACK_IMAGE_URL, getProductImage } from "@/lib/images";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LumiStatus } from "@/components/LumiStatus";

export default function BackOffice() {
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "add" | "csv">("orders");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("cuidado_facial");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("50");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [tags, setTags] = useState("");
  const [skinTypes, setSkinTypes] = useState("todas");
  const [ingredients, setIngredients] = useState("");
  const [benefits, setBenefits] = useState("");

  const [aiLoading, setAiLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Validation Warning Modal State
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Edit Product Modal State
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  // CSV State
  const [csvContent, setCsvContent] = useState("");
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [csvLoading, setCsvLoading] = useState(false);

  // Cargar datos al montar
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoadingProducts(true);
    setLoadingOrders(true);
    try {
      const p = await fetchProducts();
      setProducts(p);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo cargar el catálogo de productos.");
    } finally {
      setLoadingProducts(false);
    }

    try {
      const o = await fetchOrders();
      setOrders(o);
    } catch (err) {
      console.error(err);
      toast.error("No se pudieron cargar las órdenes de venta.");
    } finally {
      setLoadingOrders(false);
    }
  };

  // Edit Product
  const handleEditSave = async () => {
    if (!editProduct) return;
    const { _originalName, ...rest } = editProduct;
    setEditLoading(true);
    toast.promise(
      updateProduct(_originalName, {
        nombre: rest.name,
        marca: rest.brand,
        categoria: rest.category,
        tipo_piel: Array.isArray(rest.skin_types) ? rest.skin_types.join(",") : rest.skin_types || "todas",
        ingredientes: rest.ingredients || "",
        beneficios: Array.isArray(rest.benefits) ? rest.benefits.join(",") : rest.benefits || "",
        precio: rest.price,
        descripcion: rest.description || "",
        image_url: rest.image_url || "",
        stock: rest.stock,
        tags: Array.isArray(rest.tags) ? rest.tags.join(",") : rest.tags || "",
      }),
      {
        loading: "Guardando cambios en el catálogo RAG...",
        success: () => {
          setEditProduct(null);
          loadData();
          return "Producto actualizado y re-indexado en el RAG ✅";
        },
        error: (err: any) => err?.message || "No se pudo guardar el producto.",
      }
    ).finally(() => setEditLoading(false));
  };

  const handleConfirmPayment = async (ticketNumber: string) => {
    setUpdatingPayment(ticketNumber);
    toast.promise(
      updateOrderStatus(ticketNumber, "pagado"),
      {
        loading: "Registrando pago...",
        success: () => {
          loadData();
          return "Pago confirmado con éxito. Ticket liberado 💳";
        },
        error: "No se pudo registrar el pago.",
      }
    ).finally(() => {
      setUpdatingPayment(null);
    });
  };

  // Asistencia de IA ✨
  const handleAiAssist = async () => {
    if (!name.trim() || !brand.trim()) {
      toast.error("Ingresa el Nombre del Producto y la Marca para usar la asistencia de IA.");
      return;
    }

    setAiLoading(true);
    toast.promise(
      getAiAssistedProduct(name, brand),
      {
        loading: "Consultando con la IA de Lumi ✨...",
        success: (data) => {
          setDescription(data.descripcion || "");
          setIngredients(data.ingredientes || "");
          setBenefits(data.beneficios || "");
          setPrice(String(data.precio || ""));
          setStock(String(data.stock || "50"));
          setTags(data.tags || "");
          setSkinTypes(data.tipo_piel || "todas");
          setCategory(data.categoria || "cuidado_facial");
          return "Ficha pre-completada con éxito por la IA ✨";
        },
        error: (err) => {
          console.error(err);
          return "La IA no pudo autocompletar la ficha. Completa manualmente.";
        },
      }
    ).finally(() => {
      setAiLoading(false);
    });
  };

  // Guardar Producto
  const handleSaveProduct = async (bypassWarning = false) => {
    if (!name.trim() || !brand.trim() || !description.trim() || !price) {
      toast.error("Nombre, Marca, Descripción y Precio son campos obligatorios.");
      return;
    }

    // Verificar si faltan campos importantes para el RAG
    if (!bypassWarning) {
      const missing: string[] = [];
      if (!imageUrl.trim()) missing.push("Imagen del Producto (URL)");
      if (!tags.trim()) missing.push("Tags del Catálogo (Claves RAG)");
      if (!ingredients.trim()) missing.push("Ingredientes");
      if (!benefits.trim()) missing.push("Beneficios claves");
      if (!skinTypes.trim() || skinTypes === "todas") missing.push("Tipos de piel recomendados");

      if (missing.length > 0) {
        setMissingFields(missing);
        setWarningModalOpen(true);
        return;
      }
    }

    setSaveLoading(true);
    const newProduct = {
      nombre: name,
      marca: brand,
      categoria: category,
      precio: Number(price),
      stock: Number(stock) || 0,
      descripcion: description,
      image_url: imageUrl || "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&q=80",
      tags: tags,
      tipo_piel: skinTypes,
      ingredientes: ingredients,
      beneficios: benefits,
    };

    try {
      await createProduct(newProduct);
      toast.success("Producto creado con éxito e ingresado al RAG ChromaDB.");
      // Limpiar Formulario
      setName("");
      setBrand("");
      setCategory("cuidado_facial");
      setPrice("");
      setStock("50");
      setDescription("");
      setImageUrl("");
      setTags("");
      setSkinTypes("todas");
      setIngredients("");
      setBenefits("");
      setWarningModalOpen(false);
      // Recargar catálogo
      loadData();
      setActiveTab("products");
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar el producto.");
    } finally {
      setSaveLoading(false);
    }
  };

  // Importar CSV
  const handleImportCsv = async () => {
    if (!csvContent.trim()) {
      toast.error("Pega el contenido del CSV o arrastra un archivo.");
      return;
    }

    setCsvLoading(true);
    try {
      const res = await importProductsCsv(csvContent, importMode);
      toast.success(`Catálogo actualizado con éxito. ${res.count} productos registrados en ChromaDB.`);
      setCsvContent("");
      loadData();
      setActiveTab("products");
    } catch (err) {
      console.error(err);
      toast.error("Error al importar el archivo CSV. Revisa el formato de columnas.");
    } finally {
      setCsvLoading(false);
    }
  };

  // Manejar arrastre de archivo CSV
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCsvContent(event.target.result as string);
          toast.success(`Archivo "${file.name}" cargado en el editor.`);
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Solo se permiten archivos con extensión .csv");
    }
  };

  // Estadísticas globales de órdenes
  const confirmedRevenue = orders
    .filter((o) => o.status === "pagado")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const projectedRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const totalItemsOrdered = orders.reduce(
    (sum, o) => sum + o.items.reduce((itemSum: number, item: any) => itemSum + (item.qty || 0), 0),
    0
  );

  return (
    <main className="min-h-[100dvh] w-full relative overflow-x-hidden bg-background ambient-bg py-8 px-4 lg:px-8">
      {/* Botón Volver */}
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center z-10 relative">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-foreground bg-secondary hover:bg-muted py-2.5 px-4 rounded-full transition-transform active:scale-[0.98] shadow-sm"
        >
          <ArrowLeft className="size-4 mr-2" />
          Volver a Lumi
        </Link>
        <div className="flex items-center gap-4">
          <LumiStatus />
          <span className="text-eyebrow text-white tracking-widest drop-shadow-md">ADMIN CONTROL PANEL</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto glass-panel rounded-[2.5rem] p-6 lg:p-10 relative z-10 shadow-2xl flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 flex flex-col gap-2 shrink-0 lg:sticky lg:top-10 lg:self-start">
          <div className="mb-4">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Back Office</h1>
            <p className="text-xs text-muted-foreground">Sistema de Control RAG & Ventas</p>
          </div>

          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full text-left py-3.5 px-5 rounded-2xl flex items-center gap-3 transition ${
              activeTab === "orders" ? "bg-foreground text-background font-bold shadow-md" : "hover:bg-secondary text-foreground"
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>Órdenes & Ventas</span>
          </button>

          <button
            onClick={() => setActiveTab("products")}
            className={`w-full text-left py-3.5 px-5 rounded-2xl flex items-center gap-3 transition ${
              activeTab === "products" ? "bg-foreground text-background font-bold shadow-md" : "hover:bg-secondary text-foreground"
            }`}
          >
            <Package className="size-4" />
            <span>Catálogo RAG</span>
          </button>

          <button
            onClick={() => setActiveTab("add")}
            className={`w-full text-left py-3.5 px-5 rounded-2xl flex items-center gap-3 transition ${
              activeTab === "add" ? "bg-foreground text-background font-bold shadow-md" : "hover:bg-secondary text-foreground"
            }`}
          >
            <PlusCircle className="size-4" />
            <span>Nuevo Producto</span>
          </button>

          <button
            onClick={() => setActiveTab("csv")}
            className={`w-full text-left py-3.5 px-5 rounded-2xl flex items-center gap-3 transition ${
              activeTab === "csv" ? "bg-foreground text-background font-bold shadow-md" : "hover:bg-secondary text-foreground"
            }`}
          >
            <Upload className="size-4" />
            <span>Importar CSV</span>
          </button>
        </aside>

        {/* Content Area */}
        <section className="flex-1 min-w-0 lg:max-h-[calc(100dvh-200px)] lg:overflow-y-auto lg:pr-2">
          <AnimatePresence mode="wait">
            
            {/* PESTAÑA: ÓRDENES */}
            {activeTab === "orders" && (
              <motion.div
                key="orders"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center lg:sticky lg:top-0 lg:z-10 lg:-mx-1 lg:px-1 lg:py-2 lg:bg-background/80 lg:backdrop-blur-xl">
                  <h2 className="text-title">Registro de Órdenes</h2>
                  <span className="text-xs text-muted-foreground font-mono">Actualizado en tiempo real</span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-emerald-500/10">
                    <div className="size-11 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ingresos Confirmados</p>
                      <h3 className="text-lg font-bold tracking-tight mt-0.5 text-emerald-400">{formatCLP(confirmedRevenue)}</h3>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-indigo-500/10">
                    <div className="size-11 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <TrendingUp className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Venta Proyectada</p>
                      <h3 className="text-lg font-bold tracking-tight mt-0.5 text-indigo-400">{formatCLP(projectedRevenue)}</h3>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-3xl flex items-center gap-4">
                    <div className="size-11 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                      <ShoppingBag className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ítems Ordenados</p>
                      <h3 className="text-lg font-bold tracking-tight mt-0.5">{totalItemsOrdered}</h3>
                    </div>
                  </div>

                  <div className="glass-card p-5 rounded-3xl flex items-center gap-4">
                    <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Clock className="size-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tickets Generados</p>
                      <h3 className="text-lg font-bold tracking-tight mt-0.5">{orders.length}</h3>
                    </div>
                  </div>
                </div>

                {/* Historial */}
                <div className="glass-card rounded-[2rem] overflow-hidden">
                  {loadingOrders ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mx-auto mb-2 text-foreground" />
                      Cargando órdenes de venta...
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground text-sm font-sans">
                      No se han registrado órdenes aún. Completa un checkout en el chat de Lumi para generar una.
                    </div>
                  ) : (
                    <div className="overflow-x-auto overscroll-x-contain">
                      <table className="w-full min-w-[820px] text-left text-sm">
                        <thead className="bg-secondary/45 border-b border-border/40 text-[11px] font-bold tracking-wider text-muted-foreground uppercase font-mono">
                          <tr>
                            <th className="py-4 px-6">Ticket ID</th>
                            <th className="py-4 px-6">Fecha</th>
                            <th className="py-4 px-6">Cliente</th>
                            <th className="py-4 px-6">Productos</th>
                            <th className="py-4 px-6">Estado</th>
                            <th className="py-4 px-6 text-right">Total</th>
                            <th className="py-4 px-6 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20 font-medium">
                          {orders.map((o, idx) => (
                            <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                              <td className="py-4 px-6 font-mono font-bold text-foreground">{o.ticket_number}</td>
                              <td className="py-4 px-6 text-muted-foreground text-xs">{o.timestamp}</td>
                              <td className="py-4 px-6">
                                <span className="font-bold block">{o.client_name}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{o.skin_type || "Piel no esp."}</span>
                              </td>
                              <td className="py-4 px-6 max-w-[240px]">
                                <div className="space-y-1">
                                  {o.items?.map((item: any, iIdx: number) => (
                                    <div key={iIdx} className="text-xs truncate text-muted-foreground">
                                      <span className="font-bold text-foreground">{item.qty}</span> × {item.name}
                                      <span className="text-[10px] text-muted-foreground/60 font-mono block">ID: {item.id}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {o.status === "pagado" ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold font-mono">
                                    <Check className="size-3" /> PAGADO
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-bold font-mono animate-pulse">
                                    <Clock className="size-3" /> PENDIENTE
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right font-mono font-bold text-foreground">
                                {formatCLP(o.total)}
                              </td>
                              <td className="py-4 px-6 text-center">
                                {o.status !== "pagado" ? (
                                  <button
                                    onClick={() => handleConfirmPayment(o.ticket_number)}
                                    disabled={updatingPayment === o.ticket_number}
                                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-1.5 px-3.5 text-xs font-bold transition-transform active:scale-95 shadow-sm disabled:opacity-50 disabled:scale-100"
                                  >
                                    <CreditCard className="size-3" />
                                    <span>Confirmar Pago</span>
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted-foreground font-semibold flex items-center justify-center gap-1">
                                    <Check className="size-3.5 text-emerald-500" />
                                    <span>Listo</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* PESTAÑA: CATÁLOGO */}
            {activeTab === "products" && (
              <motion.div
                key="products"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center lg:sticky lg:top-0 lg:z-10 lg:-mx-1 lg:px-1 lg:py-2 lg:bg-background/80 lg:backdrop-blur-xl">
                  <h2 className="text-title">Catálogo de Productos Activos</h2>
                  <button
                    onClick={loadData}
                    className="text-xs bg-secondary hover:bg-muted py-2 px-3 rounded-full flex items-center gap-1 font-semibold"
                  >
                    Actualizar
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-foreground" />
                    Cargando catálogo del RAG...
                  </div>
                ) : products.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm font-sans">
                    El catálogo RAG está vacío. Agrega un producto manualmente o importa un CSV.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((p) => (
                      <div key={p.id} className="glass-card p-4 rounded-3xl flex gap-3 items-start relative hover:shadow-lg transition group">
                        <img
                          src={getProductImage(p)}
                          alt={p.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_IMAGE_URL;
                          }}
                          className="size-16 rounded-xl object-cover shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-mono">
                            {p.brand}
                          </span>
                          <h3 className="font-bold text-sm truncate text-foreground leading-tight mt-0.5">{p.name}</h3>
                          <div className="flex gap-2 items-center mt-1.5">
                            <span className="text-xs font-mono font-bold text-foreground">{formatCLP(p.price)}</span>
                            <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground">
                              Stock: {p.stock}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2.5">
                            {p.tags?.slice(0, 3).map((tag, idx) => (
                              <span key={idx} className="text-[9px] bg-foreground/5 px-2 py-0.5 rounded-full text-foreground/75 font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* Edit button */}
                        <button
                          onClick={() =>
                            setEditProduct({
                              ...p,
                              _originalName: p.name,
                              skin_types: Array.isArray(p.skin_types) ? p.skin_types.join(",") : p.skin_types || "",
                              tags: Array.isArray(p.tags) ? p.tags.join(",") : p.tags || "",
                              benefits: Array.isArray((p as any).benefits) ? (p as any).benefits.join(",") : (p as any).benefits || "",
                              ingredients: (p as any).ingredients || "",
                            })
                          }
                          className="absolute top-3 right-3 size-8 rounded-full bg-background/60 border border-border/40 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition opacity-0 group-hover:opacity-100"
                          aria-label="Editar producto"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* PESTAÑA: REGISTRAR PRODUCTO */}
            {activeTab === "add" && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center border-b border-border/30 pb-4">
                  <div>
                    <h2 className="text-title">Registrar Nuevo Producto</h2>
                    <p className="text-xs text-muted-foreground">Agrega ítems directamente al RAG de Lumi</p>
                  </div>
                  <button
                    onClick={handleAiAssist}
                    disabled={aiLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-2.5 px-4 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    <span>Completar con IA ✨</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-name" className="text-xs font-bold text-muted-foreground uppercase">Nombre del Producto *</label>
                    <input
                      id="new-product-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Sérum Hidratante Glow Drops"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Marca */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-brand" className="text-xs font-bold text-muted-foreground uppercase">Marca *</label>
                    <input
                      id="new-product-brand"
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ej: Lumère"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Categoría */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-category" className="text-xs font-bold text-muted-foreground uppercase">Categoría *</label>
                    <select
                      id="new-product-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground focus:ring-1 focus:ring-foreground transition"
                    >
                      <option value="cuidado_facial">Cuidado Facial</option>
                      <option value="proteccion_solar">Protección Solar</option>
                      <option value="maquillaje">Maquillaje</option>
                      <option value="limpieza">Limpieza & Geles</option>
                      <option value="fragancias">Fragancias & Perfumes</option>
                      <option value="cabello">Cuidado Capilar</option>
                    </select>
                  </div>

                  {/* Precio */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-price" className="text-xs font-bold text-muted-foreground uppercase">Precio CLP (Pesos) *</label>
                    <input
                      id="new-product-price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Ej: 48000"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Stock */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-stock" className="text-xs font-bold text-muted-foreground uppercase">Stock Inicial</label>
                    <input
                      id="new-product-stock"
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      placeholder="Ej: 50"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Tipo Piel */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-product-skin-types" className="text-xs font-bold text-muted-foreground uppercase">Tipos de Piel (Separadas por comas)</label>
                    <input
                      id="new-product-skin-types"
                      type="text"
                      value={skinTypes}
                      onChange={(e) => setSkinTypes(e.target.value)}
                      placeholder="Ej: seca, normal, sensible o 'todas'"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Image URL */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="new-product-image-url" className="text-xs font-bold text-muted-foreground uppercase">URL de la Imagen (Opcional)</label>
                    <input
                      id="new-product-image-url"
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Ej: https://images.unsplash.com/..."
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="new-product-tags" className="text-xs font-bold text-muted-foreground uppercase">Tags del Buscador (Separadas por comas)</label>
                    <input
                      id="new-product-tags"
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Ej: piel-seca, hidratación, glow, día"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="new-product-description" className="text-xs font-bold text-muted-foreground uppercase">Descripción del Producto *</label>
                    <textarea
                      id="new-product-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Descripción profunda del producto..."
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition resize-none"
                    />
                  </div>

                  {/* Ingredientes */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="new-product-ingredients" className="text-xs font-bold text-muted-foreground uppercase">Ingredientes Claves (Separados por comas)</label>
                    <input
                      id="new-product-ingredients"
                      type="text"
                      value={ingredients}
                      onChange={(e) => setIngredients(e.target.value)}
                      placeholder="Ej: ácido hialurónico, vitamina B5, escualano"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>

                  {/* Beneficios */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="new-product-benefits" className="text-xs font-bold text-muted-foreground uppercase">Beneficios Claves (Separados por comas)</label>
                    <input
                      id="new-product-benefits"
                      type="text"
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      placeholder="Ej: hidratación profunda, luminosidad inmediata, no reseca"
                      className="w-full bg-secondary border-none rounded-2xl py-3 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/30 flex justify-end gap-3">
                  <button
                    onClick={() => handleSaveProduct(false)}
                    disabled={saveLoading}
                    className="bg-foreground text-background font-bold text-xs py-3.5 px-8 rounded-full hover:opacity-90 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saveLoading && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Registrar Producto</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* PESTAÑA: CSV */}
            {activeTab === "csv" && (
              <motion.div
                key="csv"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-title">Importar Catálogo CSV</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Arrastra o pega los productos de tu catálogo masivo directamente en el motor ChromaDB
                  </p>
                </div>

                {/* Formato Requerido */}
                <div className="glass-card p-4 rounded-2xl space-y-2 border border-indigo-500/10">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 font-mono flex items-center gap-1">
                    <HelpCircle className="size-3" /> Formato de columnas requerido (CSV)
                  </span>
                  <code className="text-[10.5px] font-mono bg-background/50 p-2.5 rounded-lg block overflow-x-auto text-muted-foreground border border-border/30">
                    nombre,marca,categoria,tipo_piel,ingredientes,beneficios,precio,descripcion,image_url,stock,tags
                  </code>
                </div>

                {/* Zona de Drop */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-border/40 hover:border-foreground/20 bg-secondary/20 rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 transition cursor-pointer"
                >
                  <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-foreground">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Arrastra tu archivo catálogo.csv aquí</p>
                    <p className="text-xs text-muted-foreground mt-0.5">O edita/pega directamente el contenido a continuación</p>
                  </div>
                </div>

                {/* Editor Textarea */}
                <div className="space-y-1.5">
                  <label htmlFor="csv-editor" className="text-xs font-bold text-muted-foreground uppercase">Editor Raw CSV (Texto delimitado por comas)</label>
                  <textarea
                    id="csv-editor"
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    rows={6}
                    placeholder="Pega aquí el contenido de tu CSV..."
                    className="w-full bg-secondary border-none rounded-2xl py-3.5 px-4 text-xs text-foreground placeholder:text-muted-foreground font-mono focus:ring-1 focus:ring-foreground transition resize-none"
                  />
                </div>

                {/* Modo de importación */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-border/30 pt-4">
                  <div className="flex gap-4">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "merge"}
                        onChange={() => setImportMode("merge")}
                        className="accent-foreground size-3.5"
                      />
                      <span>Fusionar productos (Merge)</span>
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === "replace"}
                        onChange={() => setImportMode("replace")}
                        className="accent-foreground size-3.5"
                      />
                      <span>Reemplazar catálogo entero (Replace)</span>
                    </label>
                  </div>

                  <button
                    onClick={handleImportCsv}
                    disabled={csvLoading}
                    className="bg-foreground text-background font-bold text-xs py-3.5 px-8 rounded-full hover:opacity-90 transition active:scale-95 flex items-center gap-2 disabled:opacity-50 w-full sm:w-auto justify-center"
                  >
                    {csvLoading && <Loader2 className="size-3.5 animate-spin" />}
                    <span>Importar Catálogo</span>
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </div>

      {/* MODAL DE ADVERTENCIA: ¡FALTAN COSITAS! */}
      <AnimatePresence>
        {warningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/50 backdrop-blur-md"
              onClick={() => setWarningModalOpen(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-secondary/95 border border-border/55 glass-card rounded-[2.5rem] p-8 max-w-md w-full relative z-10 shadow-2xl space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">¡Faltan cositas en la ficha técnica! ⚠️</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    Aunque es posible guardar este ítem, los siguientes metadatos opcionales no se han ingresado:
                  </p>
                </div>
              </div>

              {/* Campos faltantes */}
              <div className="bg-background/40 border border-border/20 rounded-2xl p-4 max-h-[140px] overflow-y-auto">
                <ul className="text-xs space-y-1.5 text-muted-foreground list-disc list-inside">
                  {missingFields.map((field, idx) => (
                    <li key={idx} className="font-medium text-foreground/85">
                      {field}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3 text-[11px] leading-relaxed text-amber-500/90 font-medium">
                <strong>💡 RAG Tips:</strong> Las imágenes del catálogo, ingredientes clave, tags de búsqueda y la compatibilidad con tipos de piel mejoran drásticamente las recomendaciones inteligentes de Lumi.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setWarningModalOpen(false)}
                  className="flex-1 bg-secondary text-foreground text-xs font-bold py-3.5 rounded-full hover:bg-muted active:scale-95 transition"
                >
                  Volver a Completar
                </button>
                <button
                  onClick={() => handleSaveProduct(true)}
                  disabled={saveLoading}
                  className="flex-1 bg-foreground text-background text-xs font-bold py-3.5 rounded-full hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  {saveLoading && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Guardar de todas formas</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODAL: EDITAR PRODUCTO */}
      <AnimatePresence>
        {editProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-md"
              onClick={() => !editLoading && setEditProduct(null)}
            />

            {/* Sheet panel */}
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.24 }}
              className="relative z-10 w-full sm:max-w-2xl bg-secondary/95 border border-border/40 glass-card rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[90dvh] overflow-y-auto scrollbar-hide"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Pencil className="size-4 text-muted-foreground" />
                    Editar Producto
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{editProduct._originalName}</p>
                </div>
                <button
                  onClick={() => !editLoading && setEditProduct(null)}
                  aria-label="Cerrar editor de producto"
                  className="size-9 rounded-full bg-background/60 border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Form grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre del Producto *</label>
                  <input
                    id="edit-product-name"
                    value={editProduct.name}
                    onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="Nombre del producto"
                  />
                </div>

                {/* Marca */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-brand" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marca *</label>
                  <input
                    id="edit-product-brand"
                    value={editProduct.brand}
                    onChange={(e) => setEditProduct({ ...editProduct, brand: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="Marca"
                  />
                </div>

                {/* Categoría */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-category" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categoría *</label>
                  <select
                    id="edit-product-category"
                    value={editProduct.category}
                    onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                  >
                    <option value="cuidado_facial">Cuidado Facial</option>
                    <option value="proteccion_solar">Protección Solar</option>
                    <option value="maquillaje">Maquillaje</option>
                    <option value="limpieza">Limpieza</option>
                    <option value="fragancias">Fragancias</option>
                    <option value="cabello">Cabello</option>
                  </select>
                </div>

                {/* Tipos de piel */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-skin-types" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Piel</label>
                  <input
                    id="edit-product-skin-types"
                    value={editProduct.skin_types}
                    onChange={(e) => setEditProduct({ ...editProduct, skin_types: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="seca,grasa,mixta,sensible"
                  />
                </div>

                {/* Precio */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-price" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Precio (CLP) *</label>
                  <input
                    id="edit-product-price"
                    type="number"
                    value={editProduct.price}
                    onChange={(e) => setEditProduct({ ...editProduct, price: Number(e.target.value) })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="35000"
                    min={1}
                  />
                </div>

                {/* Stock */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-stock" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock</label>
                  <input
                    id="edit-product-stock"
                    type="number"
                    value={editProduct.stock}
                    onChange={(e) => setEditProduct({ ...editProduct, stock: Number(e.target.value) })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="50"
                    min={0}
                  />
                </div>

                {/* URL Imagen */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="edit-product-image-url" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">URL de Imagen</label>
                  <input
                    id="edit-product-image-url"
                    value={editProduct.image_url}
                    onChange={(e) => setEditProduct({ ...editProduct, image_url: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="https://..."
                  />
                </div>

                {/* Descripción */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="edit-product-description" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Descripción *</label>
                  <textarea
                    id="edit-product-description"
                    value={editProduct.description}
                    onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
                    rows={2}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
                    placeholder="Descripción del producto..."
                  />
                </div>

                {/* Ingredientes */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-ingredients" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingredientes</label>
                  <input
                    id="edit-product-ingredients"
                    value={editProduct.ingredients}
                    onChange={(e) => setEditProduct({ ...editProduct, ingredients: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="ácido hialurónico, vitamina C"
                  />
                </div>

                {/* Beneficios */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-product-benefits" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Beneficios</label>
                  <input
                    id="edit-product-benefits"
                    value={editProduct.benefits}
                    onChange={(e) => setEditProduct({ ...editProduct, benefits: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="hidratación, luminosidad"
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="edit-product-tags" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags RAG</label>
                  <input
                    id="edit-product-tags"
                    value={editProduct.tags}
                    onChange={(e) => setEditProduct({ ...editProduct, tags: e.target.value })}
                    className="bg-background/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                    placeholder="hidratación,glow,piel-seca"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-border/20">
                <button
                  onClick={() => setEditProduct(null)}
                  disabled={editLoading}
                  className="flex-1 py-3 rounded-full bg-background/50 border border-border/30 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={editLoading || !editProduct.name || !editProduct.brand || !editProduct.description || !editProduct.price}
                  className="flex-1 py-3 rounded-full bg-foreground text-background text-sm font-bold hover:opacity-90 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {editLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
