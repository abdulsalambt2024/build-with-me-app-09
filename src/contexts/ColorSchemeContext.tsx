import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorScheme = 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'cyan' | 'blue' | 'orange';

interface ColorSchemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const colorSchemes: Record<ColorScheme, { light: Record<string, string>; dark: Record<string, string> }> = {
  indigo: {
    light: {
      '--primary': '239 84% 67%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '239 84% 67%',
      '--sidebar-primary': '239 84% 67%',
      '--sidebar-ring': '239 84% 67%',
    },
    dark: {
      '--primary': '239 84% 67%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '239 84% 67%',
      '--sidebar-primary': '239 84% 67%',
      '--sidebar-ring': '239 84% 67%',
    },
  },
  emerald: {
    light: {
      '--primary': '160 84% 39%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '160 84% 39%',
      '--sidebar-primary': '160 84% 39%',
      '--sidebar-ring': '160 84% 39%',
    },
    dark: {
      '--primary': '160 84% 45%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '160 84% 45%',
      '--sidebar-primary': '160 84% 45%',
      '--sidebar-ring': '160 84% 45%',
    },
  },
  rose: {
    light: {
      '--primary': '346 77% 49%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '346 77% 49%',
      '--sidebar-primary': '346 77% 49%',
      '--sidebar-ring': '346 77% 49%',
    },
    dark: {
      '--primary': '346 77% 55%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '346 77% 55%',
      '--sidebar-primary': '346 77% 55%',
      '--sidebar-ring': '346 77% 55%',
    },
  },
  amber: {
    light: {
      '--primary': '38 92% 50%',
      '--primary-foreground': '0 0% 0%',
      '--ring': '38 92% 50%',
      '--sidebar-primary': '38 92% 50%',
      '--sidebar-ring': '38 92% 50%',
    },
    dark: {
      '--primary': '38 92% 55%',
      '--primary-foreground': '0 0% 0%',
      '--ring': '38 92% 55%',
      '--sidebar-primary': '38 92% 55%',
      '--sidebar-ring': '38 92% 55%',
    },
  },
  violet: {
    light: {
      '--primary': '263 70% 50%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '263 70% 50%',
      '--sidebar-primary': '263 70% 50%',
      '--sidebar-ring': '263 70% 50%',
    },
    dark: {
      '--primary': '263 70% 60%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '263 70% 60%',
      '--sidebar-primary': '263 70% 60%',
      '--sidebar-ring': '263 70% 60%',
    },
  },
  cyan: {
    light: {
      '--primary': '189 94% 43%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '189 94% 43%',
      '--sidebar-primary': '189 94% 43%',
      '--sidebar-ring': '189 94% 43%',
    },
    dark: {
      '--primary': '189 94% 50%',
      '--primary-foreground': '0 0% 0%',
      '--ring': '189 94% 50%',
      '--sidebar-primary': '189 94% 50%',
      '--sidebar-ring': '189 94% 50%',
    },
  },
  blue: {
    light: {
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '217 91% 60%',
      '--sidebar-primary': '217 91% 60%',
      '--sidebar-ring': '217 91% 60%',
    },
    dark: {
      '--primary': '217 91% 65%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '217 91% 65%',
      '--sidebar-primary': '217 91% 65%',
      '--sidebar-ring': '217 91% 65%',
    },
  },
  orange: {
    light: {
      '--primary': '24 95% 53%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '24 95% 53%',
      '--sidebar-primary': '24 95% 53%',
      '--sidebar-ring': '24 95% 53%',
    },
    dark: {
      '--primary': '24 95% 58%',
      '--primary-foreground': '0 0% 100%',
      '--ring': '24 95% 58%',
      '--sidebar-primary': '24 95% 58%',
      '--sidebar-ring': '24 95% 58%',
    },
  },
};

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined);

export function ColorSchemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const stored = localStorage.getItem('colorScheme') as ColorScheme;
    return stored || 'indigo';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const scheme = colorSchemes[colorScheme];
    const colors = isDark ? scheme.dark : scheme.light;

    Object.entries(colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  // Re-apply colors when theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const root = document.documentElement;
          const isDark = root.classList.contains('dark');
          const scheme = colorSchemes[colorScheme];
          const colors = isDark ? scheme.dark : scheme.light;

          Object.entries(colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
          });
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, [colorScheme]);

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext);
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider');
  }
  return context;
}
