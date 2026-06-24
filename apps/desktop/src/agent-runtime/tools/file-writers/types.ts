export interface Section {
  heading: string;
  level: number;
  paragraphs: string[];
  code_blocks?: string[];
}

export interface Sheet {
  name: string;
  rows: string[][];
}

export interface Topic {
  title: string;
  children?: Topic[];
}

export interface WriteXFileParams {
  output_path: string;
  title?: string;
  format?: "docx" | "pptx" | "xlsx" | "csv" | "pdf" | "xmind" | "md" | "txt";
  content?: string;
  sections?: Section[];
  sheets?: Sheet[];
  topics?: Topic[];
}

export interface FileWriter {
  extensions: string[];
  write(params: WriteXFileParams, resolvedPath: string): Promise<void>;
}
