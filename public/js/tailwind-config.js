tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "on-secondary": "#ffffff", "on-tertiary-fixed": "#002113", "tertiary-container": "#31835e",
      "error": "#ba1a1a", "background": "#f9f9ff", "primary-container": "#008651",
      "on-primary-container": "#f6fff5", "surface": "#f9f9ff", "secondary-fixed-dim": "#ffb86f",
      "inverse-surface": "#273143", "secondary-container": "#fc9912", "error-container": "#ffdad6",
      "on-tertiary-container": "#f6fff6", "on-error-container": "#93000a", "inverse-on-surface": "#ecf0ff",
      "surface-container-high": "#dfe8ff", "on-primary-fixed": "#002110", "surface-variant": "#d9e3fb",
      "on-tertiary": "#ffffff", "tertiary-fixed-dim": "#86d7ac", "tertiary": "#0e6947",
      "outline-variant": "#bccabe", "surface-bright": "#f9f9ff", "secondary-fixed": "#ffdcbd",
      "on-background": "#111c2d", "on-secondary-fixed": "#2c1600", "on-error": "#ffffff",
      "surface-dim": "#d0daf2", "tertiary-fixed": "#a2f4c7", "on-surface-variant": "#3d4a40",
      "on-primary": "#ffffff", "surface-container": "#e8eeff", "on-tertiary-fixed-variant": "#005235",
      "surface-tint": "#006d41", "inverse-primary": "#64dd9a", "on-secondary-fixed-variant": "#693c00",
      "outline": "#6d7a70", "surface-container-low": "#f0f3ff", "surface-container-highest": "#d9e3fb",
      "on-secondary-container": "#643900", "primary-fixed": "#82fab4", "primary": "#006a3f",
      "secondary": "#8a5100", "primary-fixed-dim": "#64dd9a", "on-primary-fixed-variant": "#00522f",
      "on-surface": "#111c2d", "surface-container-lowest": "#ffffff"
    },
    borderRadius: { DEFAULT: "0.125rem", lg: "0.25rem", xl: "0.5rem", full: "0.75rem" },
    spacing: { "margin-mobile": "16px", "margin-desktop": "32px", gutter: "24px", xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", xxl: "48px", unit: "4px" },
    fontFamily: {
      "body-md": ["Geist","sans-serif"], "headline-sm": ["Geist","sans-serif"], "headline-md": ["Geist","sans-serif"],
      "label-sm": ["Geist","sans-serif"], "label-md": ["Geist","sans-serif"], "body-sm": ["Geist","sans-serif"],
      "body-lg": ["Geist","sans-serif"], "display-lg": ["Geist","sans-serif"], "display-lg-mobile": ["Geist","sans-serif"]
    },
    fontSize: {
      "body-md": ["16px",{lineHeight:"24px",fontWeight:"400"}],
      "headline-sm": ["24px",{lineHeight:"32px",fontWeight:"600"}],
      "headline-md": ["30px",{lineHeight:"38px",fontWeight:"600"}],
      "label-sm": ["12px",{lineHeight:"16px",fontWeight:"500"}],
      "label-md": ["14px",{lineHeight:"20px",letterSpacing:"0.05em",fontWeight:"500"}],
      "body-sm": ["14px",{lineHeight:"20px",fontWeight:"400"}],
      "body-lg": ["18px",{lineHeight:"28px",fontWeight:"400"}],
      "display-lg": ["48px",{lineHeight:"60px",letterSpacing:"-0.02em",fontWeight:"700"}],
      "display-lg-mobile": ["36px",{lineHeight:"44px",letterSpacing:"-0.02em",fontWeight:"700"}]
    }
  } }
}
