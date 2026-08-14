/**
 * Datos que se muestran en los comprobantes impresos.
 *
 * Actualmente las órdenes no tienen relación con una sucursal y la aplicación
 * no consulta una tabla de configuración de negocio. Centralizar estos valores
 * permite actualizarlos sin introducir columnas ni duplicar información en las
 * órdenes. Cuando exista esa configuración, este objeto puede sustituirse por
 * un hook o servicio que la obtenga desde la base de datos.
 */
export const receiptBusiness = {
  name: "LaundryERP",
  branchName: "Sucursal principal",
} as const;
