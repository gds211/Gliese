

## Plan: Update Logo Text to "Gliese" with Inter Medium 500

### Changes

#### 1. Add Inter font via Google Fonts (`index.html`)
Add a `<link>` tag in `<head>` to load Inter with weight 500 from Google Fonts.

#### 2. Update logo text (`src/components/Navigation.tsx`)
- Change `GLIESE` to `Gliese`
- Change classes from `font-bold` to `font-medium` and add `style={{ fontFamily: 'Inter, sans-serif' }}` to use Inter Medium 500

### Files Modified
- `index.html`
- `src/components/Navigation.tsx`

