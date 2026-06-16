export { default as KnowledgeModule } from "./components/KnowledgeModule.js";
export { default as KBPageShell } from "./components/KBPageShell.js";
export { default as KBUploadDialog } from "./components/KBUploadDialog.js";
export { default as VectorKBPage } from "./components/VectorKBPage.js";
export { default as WikiKBPage } from "./components/WikiKBPage.js";
export { default as OntologyKBPage } from "./components/OntologyKBPage.js";
export type {
  DocStatus,
  KnowledgeDoc,
  DocChunk,
  KBType,
  KnowledgeBase,
  Strategy,
  SliceRule,
  RuleFormData,
  KBFormData,
  ChatMessage,
  KBShellTab,
} from "./types.js";
export {
  KB_TYPE_META,
  PREPROCESS_OPTIONS,
  statusConfig,
  docTypeIcon,
  DEFAULT_SLICE_RULES,
  STRATEGY_LABELS,
  STRATEGY_COLORS,
  INIT_KBS,
  DIALOG_BG,
  DIALOG_BD,
  inputCls,
  inputClsErr,
} from "./constants.js";
export { KNOWLEDGE_DOCS, DOC_CHUNKS } from "./mock.js";
