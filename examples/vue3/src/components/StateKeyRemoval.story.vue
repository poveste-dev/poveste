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
      <p data-testid="label">
        {{ state.label }}
      </p>
      <p data-testid="extras">
        {{ Object.keys(state.extras).join(',') }}
      </p>
      <button data-testid="drop" @click="delete state.extras.drop">
        Drop a key
      </button>
    </template>

    <template #controls="{ state }">
      <HstText v-model="state.label" title="label" />
    </template>
  </Story>
</template>
