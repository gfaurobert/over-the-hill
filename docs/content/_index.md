---
title: "Home"
---

<div class="hero">
  <h1>Modern Documentation</h1>
  <p>A vibrant, fast, and beautiful documentation site built with Hugo. Inspired by the clean design of Vercel and shadcn/ui, featuring modern typography, smooth animations, and excellent developer experience.</p>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="/getting-started/" class="btn">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
      </svg>
      Get Started
    </a>
    <a href="/components/" class="btn btn-secondary">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
        <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
      </svg>
      View Components
    </a>
  </div>
</div>

## ✨ Key Features

<div class="feature-grid">
  <div class="card">
    <h3>🚀 Lightning Fast</h3>
    <p>Built with Hugo for optimal performance and blazing-fast build times. Your documentation loads instantly, providing the best developer experience.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Performance</span>
    </div>
  </div>

  <div class="card">
    <h3>📱 Mobile First</h3>
    <p>Responsive design that works beautifully on all devices. From desktop to mobile, your documentation looks great everywhere.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">Responsive</span>
    </div>
  </div>

  <div class="card">
    <h3>🎨 Modern Design</h3>
    <p>Inspired by Vercel and shadcn/ui, featuring vibrant colors, smooth animations, and a clean, professional aesthetic.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">Design</span>
    </div>
  </div>

  <div class="card">
    <h3>🌙 Dark Mode</h3>
    <p>Built-in dark mode support with automatic system preference detection. Switch between light and dark themes seamlessly.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Accessibility</span>
    </div>
  </div>

  <div class="card">
    <h3>🔍 SEO Optimized</h3>
    <p>Built-in search engine optimization with proper meta tags, structured data, and fast loading times for better discoverability.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">SEO</span>
    </div>
  </div>

  <div class="card">
    <h3>⚡ Easy Customization</h3>
    <p>Simple CSS custom properties for theming. Customize colors, fonts, and spacing with ease using modern CSS variables.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Customizable</span>
    </div>
  </div>
</div>

## 🛠️ Getting Started

This site is ready to use! Here are some ways to customize it for your project:

### Adding Content

Create new pages by adding `.md` files to the `content` directory:

```markdown
---
title: "My New Page"
date: 2025-01-21
draft: false
---

# My New Page

Your content here...
```

### Customizing the Theme

The theme uses modern CSS custom properties for easy customization. You can modify colors, fonts, and spacing by editing the variables in `layouts/_default/baseof.html`.

### Navigation

The sidebar automatically shows all your pages. You can organize them by creating subdirectories in the `content` folder.

## 🎯 Modern Components

This documentation site includes several modern components inspired by shadcn/ui:

### Buttons

<div style="display: flex; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap;">
  <button class="btn">Primary Button</button>
  <button class="btn btn-secondary">Secondary Button</button>
</div>

### Cards

<div class="card">
  <h4>Example Card</h4>
  <p>This is an example card component with hover effects and modern styling. Cards are perfect for showcasing features, examples, or important information.</p>
  <div style="margin-top: 1rem;">
    <span class="badge badge-primary">Example</span>
    <span class="badge">Component</span>
  </div>
</div>

### Code Blocks

The site includes beautiful syntax highlighting for code blocks:

```javascript
// Example JavaScript code
function greet(name) {
  return `Hello, ${name}! Welcome to our modern docs.`;
}

console.log(greet('Developer'));
```

## 🚀 Built with Hugo

This site is powered by [Hugo](https://gohugo.io), the world's fastest framework for building websites. Hugo is perfect for documentation sites, blogs, and static websites.

> **Pro Tip**: Hugo's speed and flexibility make it ideal for documentation sites that need to scale with your project.

## 🎨 Design System

The design system is built around modern principles:

- **Typography**: Inter font family for excellent readability
- **Colors**: Vibrant accent colors with proper contrast ratios
- **Spacing**: Consistent spacing scale using CSS custom properties
- **Animations**: Subtle, purposeful animations that enhance UX
- **Accessibility**: WCAG compliant with proper focus states and contrast

## 📚 Ready to Explore?

Check out the [Hello page](/hello) to see an example of how individual pages look, or start adding your own content to build your perfect documentation site!

<div style="text-align: center; margin: 3rem 0;">
  <a href="/hello/" class="btn">
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
    </svg>
    Explore Examples
  </a>
</div> 