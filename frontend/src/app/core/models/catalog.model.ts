import { ProductoOrden } from '../services/product.service';

export const DEFAULT_CATALOG_PAGE_SIZE = 9;
export const MIN_CATALOG_PRICE = 0;
export const MAX_CATALOG_PRICE = 999999;

export interface CatalogFilters {
  page: number;
  pageSize: number;
  categoriaId: number | null;
  marcaId: number | null;
  precioMin: number | null;
  precioMax: number | null;
  buscar: string;
  enOferta: boolean | null;
  orden: ProductoOrden;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  page: 1,
  pageSize: DEFAULT_CATALOG_PAGE_SIZE,
  categoriaId: null,
  marcaId: null,
  precioMin: null,
  precioMax: null,
  buscar: '',
  enOferta: null,
  orden: 'reciente',
};

export interface CatalogSortOption {
  label: string;
  value: ProductoOrden;
}

export const CATALOG_SORT_OPTIONS: CatalogSortOption[] = [
  { label: 'Mas recientes', value: 'reciente' },
  { label: 'Precio: menor a mayor', value: 'precio_asc' },
  { label: 'Precio: mayor a menor', value: 'precio_desc' },
  { label: 'Nombre: A-Z', value: 'nombre_asc' },
  { label: 'Nombre: Z-A', value: 'nombre_desc' },
];
