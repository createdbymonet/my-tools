import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import type { Profile } from '../src/types/profile.ts'

function profile(name: string): Profile {
  return {
    personalInfo: {
      name,
      professionalTitle: '',
      location: '',
      email: '',
      phone: '',
      links: [],
      workAuthorization: '',
    },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    sectionOrder: [],
  }
}

async function loadProfile(
  mode: string,
  fallback: unknown,
  development?: unknown,
): Promise<Profile> {
  const root = await mkdtemp(join(tmpdir(), 'resume-profile-loading-'))
  let server: Awaited<ReturnType<typeof createServer>> | undefined
  try {
    for (const path of [
      'src/data/currentApplication.ts',
      'src/utils/validateData.ts',
      'src/types/profile.ts',
      'src/data/applications/sample-company.json',
    ]) {
      const destination = join(root, path)
      await mkdir(dirname(destination), { recursive: true })
      await copyFile(fileURLToPath(new URL(`../${path}`, import.meta.url)), destination)
    }
    await writeFile(join(root, 'src/data/profile.json'), JSON.stringify(fallback))
    if (development !== undefined) {
      await writeFile(join(root, 'src/data/profile.development.json'), JSON.stringify(development))
    }
    server = await createServer({
      root,
      configFile: false,
      mode,
      appType: 'custom',
      logLevel: 'silent',
      define: { 'import.meta.env.VITE_APPLICATION': JSON.stringify('sample-company') },
      server: { middlewareMode: true, watch: null, hmr: false, ws: false },
    })
    const module = (await server.ssrLoadModule(
      '/src/data/currentApplication.ts',
    )) as typeof import('../src/data/currentApplication.ts')
    return module.profile
  } finally {
    await server?.close()
    if (
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !basename(root).startsWith('resume-profile-loading-')
    ) {
      throw new Error(`Unexpected profile test fixture directory: ${root}`)
    }
    await rm(root, { recursive: true, force: true })
  }
}

for (const mode of ['development', 'production']) {
  test(`${mode}: uses the tracked profile when the local profile is absent`, async () => {
    const fallback = profile('Tracked profile')
    assert.deepEqual(await loadProfile(mode, fallback), fallback)
  })

  test(`${mode}: the local profile replaces the whole tracked file`, async () => {
    const fallback = {
      ...profile('Tracked profile'),
      summary: 'Only in the tracked profile',
      languages: [{ id: 'english', name: 'English', proficiency: 'Native' }],
    }
    const development = profile('Local profile')
    assert.deepEqual(await loadProfile(mode, fallback, development), development)
  })

  test(`${mode}: only the selected profile is validated`, async () => {
    const development = profile('Local profile')
    assert.deepEqual(await loadProfile(mode, {}, development), development)
  })

  test(`${mode}: missing local properties fail instead of inheriting tracked values`, async () => {
    const { summary: _summary, ...incomplete } = profile('Incomplete local profile')
    await assert.rejects(
      loadProfile(mode, profile('Tracked profile'), incomplete),
      /profile\.summary: required field is missing/,
    )
  })

  test(`${mode}: a null local profile fails instead of using the tracked profile`, async () => {
    await assert.rejects(
      loadProfile(mode, profile('Tracked profile'), null),
      /profile: expected an object/,
    )
  })
}
