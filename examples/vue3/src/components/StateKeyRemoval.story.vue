<template>
  <Story
    title="State key removal"
    :init-state="() => ({
      label: 'start',
      extras: {
        keep: 1,
        drop: 2,
      },
    })"
  >
    <template #default="{ state }">
      <p data-test-id="label">
        {{ state.label }}
      </p>
      <p data-test-id="extras">
        {{ Object.keys(state.extras).join(',') }}
      </p>
      <button data-test-id="drop" @click="delete state.extras.drop">
        Drop a key
      </button>
    </template>

    <template #controls="{ state }">
      <HstText v-model="state.label" title="label" />
    </template>
  </Story>
</template>
