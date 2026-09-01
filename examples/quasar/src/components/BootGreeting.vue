<template>
  <!-- $greeting is set by a boot file, which only runs because the setup file
       calls it. Without that it is undefined and this renders the fallback. -->
  <q-banner class="bg-primary text-white">
    {{ $greeting ?? 'NO BOOT FILE RAN' }}
  </q-banner>
</template>
