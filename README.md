# SyncDBG: Offline-First Data Synchronization for Web Applications

**NPM version**

**License:** MIT

**SyncDBG** is a robust JavaScript/TypeScript library for building offline-first web applications. It provides a complete mechanism to store data locally in the browser, intelligently synchronize with a backend when the connection is restored, and flexibly resolve data conflicts.  

Inspired by solutions like **AFFiNE** and **PouchDB**, SyncDBG was designed to be a generic, reusable, and easy-to-integrate component for any web development stack, with first-class support for React.

---

## ✨ Key Features

- **Robust Local Persistence:** Uses IndexedDB to store large volumes of structured data asynchronously without blocking the UI.  
- **Smart Synchronization:** Automatically detects online/offline status and manages an operation queue to sync with the backend only when possible.  
- **Optimistic UI:** Changes are instantly reflected in the UI, providing a smooth user experience even on unstable networks.  
- **Conflict Resolution:** Supports multiple conflict resolution strategies like *Last-Write-Wins*, *Server-Wins*, or custom merge logic.  
- **Reactive and Simple API:** An intuitive API to manage data collections and subscribe to updates, with ready-to-use React Hooks.  
- **Modular Architecture:** Decoupled and extensible, enabling the creation of new persistence or API adapters.  

---

## 📦 Packages in the Monorepo

This repository is a **pnpm-managed monorepo**.

| Package                     | NPM | Description                                                                 |
|-----------------------------|-----|-----------------------------------------------------------------------------|
| **@syncdbg/core**           | npm | The framework-agnostic core engine with all synchronization logic.           |
| **@syncdbg/adapter-indexeddb** | npm | Persistence adapter for IndexedDB.                                           |
| **@syncdbg/react**          | npm | React Hooks (`useSyncState`, `useCollection`) for seamless integration.      |
| **@syncdbg/utils**          | npm | Utility functions shared across the monorepo.                                |

---

## 🚀 Quick Start Guide (with React)

This guide shows how to integrate SyncDBG into a React application.

### 1. Installation

Install the required packages in your project:

```bash
npm install @syncdbg/core @syncdbg/adapter-indexeddb @syncdbg/react
# or
yarn add @syncdbg/core @syncdbg/adapter-indexeddb @syncdbg/react
# or
pnpm add @syncdbg/core @syncdbg/adapter-indexeddb @syncdbg/react
```

---

### 2. Configuring the SyncDBG Client

In your application entry point (e.g., `index.tsx` or `App.tsx`), create and configure the `SyncDBGClient` instance:

```tsx
// src/client.ts
import { SyncDBGClient } from '@syncdbg/core';
import { IndexedDBAdapter } from '@syncdbg/adapter-indexeddb';

// Define your backend contract. SyncDBG expects a simple API contract.
const apiAdapter = {
  async push(operations) {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
    });
    if (!response.ok) throw new Error('Failed to push changes');
    return response.json(); // Expected: { successful: string[], failed: any[] }
  },
  async pull(lastPulledAt) {
    const response = await fetch(`/api/sync?lastPulledAt=${lastPulledAt || 0}`);
    if (!response.ok) throw new Error('Failed to fetch changes');
    return response.json(); // Expected: { changes: Operation[], timestamp: number }
  },
};

// Create the client instance
export const syncDBGClient = new SyncDBGClient({
  persistenceAdapter: new IndexedDBAdapter({
    dbName: 'my-app-db',
    dbVersion: 1,
    collections: ['notes', 'tasks'], // declare all collections here
  }),
  apiAdapter,
});
```

---

### 3. Wrapping the App with the Provider

Use the `SyncDBGProvider` to make the client available across your React components.

```tsx
// src/App.tsx
import React from 'react';
import { SyncDBGProvider } from '@syncdbg/react';
import { syncDBGClient } from './client';
import { NotesList } from './NotesList';

function App() {
  return (
    <SyncDBGProvider client={syncDBGClient}>
      <div className="App">
        <h1>My Notes (Offline-First)</h1>
        <NotesList />
      </div>
    </SyncDBGProvider>
  );
}

export default App;
```

---

### 4. Using Hooks in Your Components

Now you can use `useCollection` and `useNetworkStatus` hooks to read and update data reactively.

```tsx
// src/NotesList.tsx
import React from 'react';
import { useCollection, useNetworkStatus } from '@syncdbg/react';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export function NotesList() {
  const { data: notes, collection: notesCollection } = useCollection<Note>('notes');
  const isOnline = useNetworkStatus();

  const handleAddNote = () => {
    const title = prompt('New note title:');
    if (title) {
      notesCollection.add({
        title,
        content: '',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      <button onClick={handleAddNote}>Add Note</button>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>
            <strong>{note.title}</strong>
            <button onClick={() => notesCollection.delete(note.id)}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

And that’s it! 🎉  
With these steps, your app now stores notes locally, displays them instantly, and synchronizes with the backend in the background.

---

## 🛠️ For Developers (Contributing)

Interested in contributing? Awesome! Follow the steps below to set up your development environment:

```bash
# Clone the repo
git clone https://github.com/fmartini23/syncdbg.git
cd syncdbg

# Install pnpm (if not already installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development mode
pnpm dev
```

This command watches all `packages/*` and recompiles them automatically when changes are made.

### Useful Scripts

- `pnpm build`: Builds all packages for production.  
- `pnpm dev`: Starts development mode for all packages.  
- `pnpm lint`: Runs code quality checks across the project.  
- `pnpm format:check`: Ensures code is properly formatted with Prettier.  

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for more details.  
