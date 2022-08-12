<script setup>
import { onMounted, ref } from 'vue'

const time = ref('')

onMounted(() => {
  // eslint-disable-next-line no-console
  console.log('onMounted')

  time.value = window.dayjs().toISOString()
})
</script>

<template>
  {{ time }}
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
