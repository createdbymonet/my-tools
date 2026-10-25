<script setup lang="ts">
import type { CoverLetterDocument } from '../../types/documents'
import PlaceholderText from '../shared/PlaceholderText.vue'
import { computed } from 'vue'

const props = defineProps<{ letter: CoverLetterDocument }>()
const recipientLines = computed(() =>
  [props.letter.recipient, props.letter.company.name, props.letter.company.location].filter(
    (text) => text.trim(),
  ),
)
const body = computed(() => props.letter.body.filter((text) => text.trim()))
const formattedDate = computed(() =>
  props.letter.date
    ? new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${props.letter.date}T00:00:00Z`))
    : '',
)
</script>

<template>
  <main class="document-content letter-content">
    <time v-if="letter.date" class="letter-date" :datetime="letter.date">{{ formattedDate }}</time>
    <div v-if="recipientLines.length" class="letter-recipient">
      <p v-for="(line, index) in recipientLines" :key="index"><PlaceholderText :text="line" /></p>
    </div>
    <p v-if="letter.company.position.trim()" class="letter-subject">
      Re: <PlaceholderText :text="letter.company.position" />
    </p>
    <div v-if="letter.greeting.trim() || letter.opening.trim()" class="letter-opening">
      <p v-if="letter.greeting.trim()" class="letter-greeting">
        <PlaceholderText :text="letter.greeting" />
      </p>
      <p v-if="letter.opening.trim()"><PlaceholderText :text="letter.opening" /></p>
    </div>
    <p v-for="(paragraph, index) in body" :key="index"><PlaceholderText :text="paragraph" /></p>
    <div
      v-if="letter.closing.trim() || letter.signOff.trim() || letter.personalInfo.name.trim()"
      class="letter-closing"
    >
      <p v-if="letter.closing.trim()"><PlaceholderText :text="letter.closing" /></p>
      <div v-if="letter.signOff.trim() || letter.personalInfo.name.trim()" class="letter-signature">
        <p v-if="letter.signOff.trim()"><PlaceholderText :text="letter.signOff" /></p>
        <p v-if="letter.personalInfo.name.trim()" class="sender-name">
          <PlaceholderText :text="letter.personalInfo.name" />
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped lang="scss">
.letter-content {
  padding-top: 10mm;
  font-size: 10.5pt;
  line-height: 1.5;

  p {
    margin: 0 0 4mm;
    white-space: pre-line;
  }

  .letter-subject {
    margin-bottom: 7mm;
    color: var(--accent);
    font-weight: 600;
  }

  .letter-greeting {
    margin-bottom: 4mm;
  }
}

.letter-date {
  display: block;
  margin-bottom: 7mm;
  color: var(--muted);
}

.letter-recipient {
  margin-bottom: 7mm;

  p {
    margin: 0;
  }
}

.letter-signature {
  margin-top: 7mm;

  p {
    margin-bottom: 2mm;
  }

  .sender-name {
    font-weight: 600;
  }
}

@media print {
  .letter-recipient,
  .letter-opening,
  .letter-closing {
    break-inside: avoid;
  }
}
</style>
