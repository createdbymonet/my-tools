<script setup lang="ts">
import PlaceholderText from './PlaceholderText.vue'

defineProps<{ kind: 'resume' | 'cover-letter'; company: string; hasPlaceholders: boolean }>()
function printDocument() {
  window.print()
}
</script>

<template>
  <div class="preview-shell">
    <div class="preview-toolbar" aria-label="Document preview controls">
      <div class="preview-heading">
        <span class="eyebrow"> APPLICATION DOCUMENTS </span>
        <span v-if="company.trim()" class="preview-company">
          <PlaceholderText :text="company" />
        </span>
      </div>
      <div class="preview-actions">
        <nav class="document-tabs" aria-label="Documents">
          <a href="./resume.html" :aria-current="kind === 'resume' ? 'page' : undefined">
            Resume
          </a>
          <a
            href="./cover-letter.html"
            :aria-current="kind === 'cover-letter' ? 'page' : undefined"
          >
            Cover letter
          </a>
        </nav>
        <button type="button" data-print-button @click="printDocument">Print / Save PDF</button>
      </div>
    </div>
    <div class="preview-meta">
      <span>
        {{ kind === 'resume' ? 'RESUME' : 'COVER LETTER' }}
      </span>
      <span> LETTER · 8.5 × 11 IN </span>
    </div>
    <p v-if="hasPlaceholders" class="draft-note">
      Draft · Highlighted brackets are fields to complete before sending.
    </p>
    <slot />
    <p class="preview-footer">Print at 100% scale · Turn off browser headers and footers</p>
  </div>
</template>

<style scoped lang="scss">
.preview-shell {
  max-width: 8.5in;
  margin: 0 auto;
  padding: 28px 0 20px;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.preview-heading {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.13em;
  color: #776d66;
}

.preview-company {
  font-size: 14px;
  font-weight: 600;

  :deep(.fill) {
    padding: 0;
    background: transparent;
  }
}

.preview-actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;

  button {
    font:
      600 12px Arial,
      sans-serif;
    border: 1px solid #332b26;
    background: #332b26;
    color: #fff;
    padding: 11px 15px;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #514339;
    }
  }

  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
}

.document-tabs {
  display: flex;
  background: #e7e1db;
  border-radius: 5px;
  padding: 3px;

  a {
    font-size: 12px;
    color: #655c55;
    text-decoration: none;
    border-radius: 3px;
    padding: 8px 12px;

    &[aria-current='page'] {
      background: #fff;
      color: #282320;
      box-shadow: 0 1px 3px #00000010;
    }
  }
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 9px;
  letter-spacing: 0.11em;
  color: #776d66;
}

.draft-note {
  font-size: 11px;
  color: #776d66;
  margin: 0 0 12px;
}

.preview-footer {
  margin: 20px 0 0;
  font-size: 11px;
  color: #776d66;
  text-align: center;
}

@media screen and (max-width: 860px) {
  .preview-shell {
    padding: 20px 16px;
  }
}

@media screen and (max-width: 600px) {
  .preview-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 20px;
  }

  .preview-actions {
    width: 100%;
    gap: 8px;
    justify-content: space-between;

    button {
      padding: 11px;
    }
  }

  .document-tabs a {
    padding: 8px;
  }
}

@media print {
  .preview-shell {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  .preview-toolbar,
  .preview-meta,
  .draft-note,
  .preview-footer {
    display: none !important;
  }
}
</style>
