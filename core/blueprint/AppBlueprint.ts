export interface Page {
  id: string;
  name: string;
  title: string;
  path: string;
  content?: string;
  components: Component[];
}

export interface Component {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

export interface LayoutMetadata {
  previewMode: 'desktop' | 'mobile';
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface AppBlueprint {
  id: string;
  name: string;
  domain?: string;
  createdAt: string;
  updatedAt: string;
  pages: Page[];
  layout: LayoutMetadata;
}

