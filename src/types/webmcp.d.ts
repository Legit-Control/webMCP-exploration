declare global {
  namespace JSX {
    interface IntrinsicElements {
      "webmcp-agent": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "app-id"?: string;
          "api-base"?: string;
          "view-mode"?: "pill" | "panel" | "modal";
        },
        HTMLElement
      >;
    }
  }
}

export {};
