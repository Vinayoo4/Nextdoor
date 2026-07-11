import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './index.css'
import { client } from './services/appwrite'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

client.ping()
  .then(() => console.log('Appwrite ping function added and executed to verify setup.'))
  .catch((err) => console.error('Appwrite ping failed:', err))
