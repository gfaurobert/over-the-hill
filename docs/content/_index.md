---
title: "Over The Hill - Hill Chart Generator"
---

<div class="hero">
  <h1>Over The Hill</h1>
  <p>A web and desktop application designed to visualize project progress using Hill Charts. Inspired by 37signals Hill Charts, this tool helps you track tasks through discovery and execution phases.</p>
  <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
    <a href="https://over-the-hill.faurobert.fr/" class="btn" target="_blank">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
      </svg>
      Try Live Demo
    </a>
    <a href="/hello/" class="btn btn-secondary">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
        <path d="M7 5.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 1 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0zM7 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-1.496-.854a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-.5-.5a.5.5 0 0 1 .708-.708l.146.147 1.146-1.147a.5.5 0 0 1 .708 0z"/>
      </svg>
      View Documentation
    </a>
  </div>
</div>

## ✨ Key Features

<div class="feature-grid">
  <div class="card">
    <h3>📊 Hill Chart Visualization</h3>
    <p>Create and manage "dots" representing tasks, features, or items you want to track. Position them on the hill to show progress through discovery and execution phases.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Core Feature</span>
    </div>
  </div>

  <div class="card">
    <h3>🎨 Customizable Dots</h3>
    <p>Assign names, colors (blue, green, red, orange, purple), and sizes (1-5) to each dot for better categorization and visual distinction.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">Customization</span>
    </div>
  </div>

  <div class="card">
    <h3>📁 Collections</h3>
    <p>Group related dots into collections to manage multiple projects or different aspects of a single project.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">Organization</span>
    </div>
  </div>

  <div class="card">
    <h3>📤 Export & Share</h3>
    <p>Copy the generated hill chart as a PNG image or SVG file to your clipboard, or download it as a PNG file for easy sharing and documentation.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Sharing</span>
    </div>
  </div>

  <div class="card">
    <h3>🌙 Theme Support</h3>
    <p>Switch between light, dark, or system-preferred themes for a comfortable viewing experience.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-success">Accessibility</span>
    </div>
  </div>

  <div class="card">
    <h3>💻 Web & Desktop</h3>
    <p>Available as both a web application and desktop application, giving you flexibility in how you use the tool.</p>
    <div style="margin-top: 1rem;">
      <span class="badge badge-primary">Cross-Platform</span>
    </div>
  </div>
</div>

## 🛠️ How to Use

### 1. Add Dots
Click the "Add Dot" button to create a new task or item.

### 2. Name and Customize
In the dot editing panel, give your dot a name, and select its color and size using the dropdowns.

### 3. Position on the Hill
Drag the dot on the hill chart to reflect its current status:
- **Up the Hill (Left Side)**: For tasks where you're still exploring, researching, or solving problems
- **Down the Hill (Right Side)**: For tasks where the path is clear, and you're actively implementing

### 4. Manage Collections
Use the "Collections" dropdown to create new collections, switch between them, or manage existing ones.

### 5. Export/Share
- Click the ellipsis menu (`...`) in the top right corner
- Under "Export Clipboard Format," choose "Copy as PNG" or "Copy as SVG" to set the clipboard format
- Click the "Copy" button in the chart header to copy the chart to your clipboard
- Click the "Download PNG" button to save the chart as a PNG file

## 🎯 What is a Hill Chart?

Hill Charts are a simple yet powerful tool for tracking the status of tasks or features, categorizing them into two main phases:

- **"Up the Hill" (Discovery/Problem-solving)**: When you're still figuring things out, exploring options, or solving problems
- **"Down the Hill" (Execution/Implementation)**: When the path is clear and you're actively implementing the solution

This visualization technique was popularized by 37signals and is described in their book "Shape Up: Show Progress (Chapter 13)".

## 🚀 Live Demo

Try the application live at: **[https://over-the-hill.faurobert.fr/](https://over-the-hill.faurobert.fr/)**

## 📚 Documentation

Explore the documentation to learn more about features and usage:

<div style="text-align: center; margin: 3rem 0;">
  <a href="/hello/" class="btn">
    <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z"/>
    </svg>
    View Documentation
  </a>
</div> 