# Juegos sugeridos

Registro de juegos evaluados por el subagente `game-planner` (`.claude/agents/game-planner.md`) como posibles candidatos para el catálogo de Arcade Vault. Es la memoria del agente: antes de proponer un juego nuevo, lee esta tabla completa para no repetir una sugerencia ya descartada.

| Fecha | Juego | id  | Categoría | Veredicto | Razón | Spec |
| ----- | ----- | --- | --------- | --------- | ----- | ---- |
|       |       |     |           |           |       |      |

---

**Notas sobre el contrato de este archivo:**

- **Append-only**: agregar filas nuevas al final; no reordenar ni borrar filas existentes. La única edición permitida sobre una fila ya escrita es actualizar su `Veredicto` (por ejemplo de `candidato` a `implementado`) y su columna `Spec`.
- **`descartado`** significa que no debe volver a proponerse sin un motivo nuevo y explícito (cambio de contexto, pedido directo del usuario, etc.) — no basta con que "suene bien" otra vez.
- **`candidato`** es una idea válida que no fue la elegida en su momento; puede resurgir en una corrida futura sin motivo adicional.
- **`recomendado`** es el ganador de una corrida — la propuesta principal en el momento de la sugerencia.
- **`implementado`** se sincroniza a mano cuando el spec correspondiente aterriza y el juego pasa a `references/implemented-games.md`.
- La fila de ejemplo (vacía) de arriba se elimina en cuanto se agregue la primera sugerencia real.
