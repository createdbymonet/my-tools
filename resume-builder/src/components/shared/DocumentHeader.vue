<script setup lang="ts">
import { computed } from 'vue'
import type { ContactLink, PersonalInfo } from '../../types/profile'
import { safeLink } from '../../utils/safeLink'
import PlaceholderText from './PlaceholderText.vue'

const props = defineProps<{ personalInfo: PersonalInfo }>()
const contacts = computed<ContactLink[]>(() => {
  const info = props.personalInfo
  return [
    ...(info.location.trim() ? [{ id: 'contact-location', label: info.location, url: '' }] : []),
    ...(info.phone.trim()
      ? [
          {
            id: 'contact-phone',
            label: info.phone,
            url: `tel:${info.phone.replace(/[^+\d]/g, '')}`,
          },
        ]
      : []),
    ...(info.email.trim()
      ? [{ id: 'contact-email', label: info.email, url: `mailto:${info.email}` }]
      : []),
    ...info.links
      .filter((link) => link.label.trim())
      .map((link) => ({ ...link, id: `link-${link.id}` })),
  ]
})
const hasContent = computed(
  () =>
    props.personalInfo.name.trim() ||
    props.personalInfo.professionalTitle.trim() ||
    contacts.value.length ||
    props.personalInfo.workAuthorization.trim(),
)
</script>

<template>
  <header v-if="hasContent" class="band">
    <h1 v-if="personalInfo.name.trim()">
      <PlaceholderText :text="personalInfo.name" />
    </h1>
    <p v-if="personalInfo.professionalTitle.trim()" class="professional-title">
      <PlaceholderText :text="personalInfo.professionalTitle" />
    </p>
    <p v-if="contacts.length" class="contact">
      <template v-for="(contact, index) in contacts" :key="contact.id">
        <template v-if="index"> | </template>
        <a v-if="safeLink(contact.url)" :href="safeLink(contact.url)">
          <PlaceholderText :text="contact.label" />
        </a>
        <PlaceholderText v-else :text="contact.label" />
      </template>
    </p>
    <p v-if="personalInfo.workAuthorization.trim()" class="authorization">
      <PlaceholderText :text="personalInfo.workAuthorization" />
    </p>
  </header>
</template>

<style scoped lang="scss">
.band {
  background: var(--accent);
  color: #fff;
  padding: 11mm 16mm 5mm;

  h1 {
    margin: 0;
    font-size: 23pt;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  .professional-title {
    margin: 2px 0 6px;
    font-size: 11.5pt;
    opacity: 0.95;
  }

  .contact,
  .authorization {
    margin: 0;
    font-size: 9.2pt;
    opacity: 0.95;
  }
}

.contact {
  overflow-wrap: anywhere;
}

@media screen and (max-width: 600px) {
  .band {
    padding: 8mm 7mm 5mm;
  }
}

@media print {
  .band {
    break-inside: avoid;
  }
}
</style>
