/**
 * Nome do evento global que inicia o tour guiado. Mora num módulo sem `"use
 * client"` para servir tanto a quem dispara (botões de componente cliente)
 * quanto a quem escuta (o overlay), sem arrastar um componente para o outro.
 */
export const GUIDE_START_EVENT = "gitmon:guide:start";
