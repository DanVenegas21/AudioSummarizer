# ⚡ Guía de Inicio Rápido

¿Primera vez usando Audio Summarizer? Sigue estos simples pasos.

## 🚀 3 Pasos para Comenzar

### 1️⃣ Obtén tu API Key de Speechmatics (GRATIS)

1. Ve a [portal.speechmatics.com](https://portal.speechmatics.com/)
2. Crea una cuenta (obtienes créditos gratuitos)
3. Copia tu API key desde el panel

### 2️⃣ Inicia el Servidor

**Windows:**
- Haz doble clic en `start_server.bat`

**Mac/Linux:**
```bash
chmod +x start_server.sh
./start_server.sh
```

**Manual (cualquier sistema):**
```bash
pip install -r requirements.txt
python app.py
```

### 3️⃣ Usa la Aplicación

1. Abre tu navegador en: `http://localhost:5000/frontend`
2. Arrastra un archivo de audio o haz clic en "Select File"
3. Haz clic en "Process Audio File"
4. Ingresa tu API key cuando te lo pida
5. Espera mientras se procesa (puede tomar 1-3 minutos)
6. ¡Listo! Ve tu transcripción y resumen

---

## 📱 Ejemplo Visual

```
┌─────────────────────────────────────┐
│  1. Arrastra tu archivo de audio   │
│     (MP3, WAV, FLAC, etc.)         │
└─────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────┐
│  2. Haz clic en "Process"          │
└─────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────┐
│  3. Ingresa tu API key             │
│     (solo la primera vez)          │
└─────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────┐
│  4. Espera (1-3 minutos)           │
│     ⏳ Procesando...                │
└─────────────────────────────────────┘
              ⬇️
┌─────────────────────────────────────┐
│  5. ¡Resultados listos! ✅         │
│                                     │
│  📊 Estadísticas                   │
│  🗣️  Hablantes                     │
│  🔑 Palabras clave                 │
│  📝 Transcripción completa         │
└─────────────────────────────────────┘
```

---

## ⚙️ Configuración Opcional (Recomendada)

Para no tener que ingresar la API key cada vez:

1. En la carpeta `backend`, crea un archivo llamado `.env`
2. Agrega esta línea:
   ```
   SPEECHMATICS_API_KEY=tu_api_key_aqui
   ```
3. Guarda el archivo
4. Reinicia el servidor

¡Ahora no tendrás que ingresar la API key manualmente!

---

## 🎯 Casos de Uso Comunes

### Transcribir una Reunión
1. Graba tu reunión en cualquier formato de audio
2. Sube el archivo a Audio Summarizer
3. Obtén la transcripción con identificación de hablantes
4. Descarga el resultado en formato texto

### Generar Resumen de Entrevista
1. Sube tu archivo de audio de la entrevista
2. Procesa el archivo
3. Revisa las palabras clave y estadísticas
4. Usa la transcripción completa como referencia

### Analizar Conversaciones
1. Sube un archivo con múltiples hablantes
2. Ve las estadísticas de cada hablante
3. Identifica quién habló más y cuánto
4. Revisa la transcripción organizada por hablante

---

## 💡 Consejos Pro

### Para Mejores Resultados:
- ✅ Usa audio de buena calidad
- ✅ Minimiza el ruido de fondo
- ✅ Habla claro y a volumen moderado
- ✅ Usa formato MP3 o WAV para mejor compatibilidad

### Para Ahorrar Tiempo:
- ✅ Configura la API key en el archivo `.env`
- ✅ Usa archivos de menos de 50MB cuando sea posible
- ✅ Descarga las transcripciones para uso futuro

### Para Archivos Grandes:
- ✅ Considera dividir archivos muy largos (>1 hora)
- ✅ Ten paciencia: archivos grandes toman más tiempo
- ✅ Mantén la ventana del navegador abierta durante el procesamiento

---

## ❓ Preguntas Frecuentes

**P: ¿Cuánto cuesta usar Speechmatics?**  
R: Speechmatics ofrece créditos gratuitos para nuevas cuentas. Después, consulta sus planes en [speechmatics.com](https://www.speechmatics.com/pricing)

**P: ¿Qué formatos de audio son compatibles?**  
R: MP3, WAV, M4A, OGG, FLAC, AAC, WMA

**P: ¿Cuánto tiempo toma procesar un audio?**  
R: Depende del tamaño del archivo. Un audio de 5 minutos puede tomar 1-2 minutos en procesarse.

**P: ¿Puedo usar esto sin conexión a Internet?**  
R: No, se requiere Internet para conectar con la API de Speechmatics.

**P: ¿Los archivos se guardan en el servidor?**  
R: Los archivos temporales se guardan durante el procesamiento pero puedes eliminarlos después. Configura el servidor según tus necesidades de privacidad.

**P: ¿Funciona en mi idioma?**  
R: Speechmatics soporta múltiples idiomas. Por defecto está configurado en español, pero puedes cambiar el idioma en el código.

**P: ¿Puedo procesar múltiples archivos a la vez?**  
R: Actualmente solo se procesa un archivo a la vez. El procesamiento en batch está en el roadmap.

---

## 🆘 Solución Rápida de Problemas

### "Python no se reconoce como comando"
→ Instala Python desde [python.org](https://python.org)

### "ModuleNotFoundError: No module named 'flask'"
→ Ejecuta: `pip install -r requirements.txt` en la carpeta `backend`

### "Address already in use" / Puerto 5000 ocupado
→ Cambia el puerto: `PORT=8080 python app.py`

### "File too large. Maximum size is 100MB"
→ Reduce el tamaño del archivo o aumenta el límite en `backend/app.py`

### "API key is required"
→ Configura tu API key en un archivo `.env` o ingrésala manualmente

### El servidor no responde
→ Verifica que el servidor esté ejecutándose y no haya errores en la consola

---

## 📚 Siguientes Pasos

Una vez que hayas procesado tu primer audio:

1. 📖 Lee el [README.md](README.md) completo para conocer todas las funcionalidades
2. 🔧 Revisa [INSTALL.md](INSTALL.md) para configuración avanzada
3. 💻 Consulta [API_EXAMPLES.md](API_EXAMPLES.md) si quieres integrar con tu propio código
4. 📝 Revisa [CHANGELOG.md](CHANGELOG.md) para ver todas las características

---

## 🎉 ¡Listo para Comenzar!

Ahora tienes todo lo que necesitas para transcribir y resumir tus audios.

**¿Problemas?** Revisa la documentación completa o abre un issue.

**¿Te gusta el proyecto?** ⭐ Dale una estrella en GitHub y compártelo.

---

**Tiempo estimado de configuración:** 5 minutos  
**Tiempo estimado de primer uso:** 2 minutos  
**Nivel de dificultad:** Principiante 👶

¡Disfruta transcribiendo! 🎙️✨

