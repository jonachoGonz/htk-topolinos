# Netlify Deploy Guide - HTK Center Topolinos

## ✅ Pre-Deploy Checklist (COMPLETADO)

- ✅ Node.js versión especificada (.nvmrc = 22.16.0)
- ✅ Build verificado localmente (npm run build)
- ✅ Todas las fases mergeadas a main (Phase 1-5)
- ✅ Git working tree clean
- ✅ netlify.toml configurado
- ✅ Funciones de Netlify en place
- ✅ .env con variables de entorno

## 🚀 Deploy Steps

### 1. Verificar URL de Netlify
Tu sitio debería estar en: `https://htk-topolinos.netlify.app`
O el dominio custom que tengas configurado

### 2. Monitorear Build en Netlify
Dashboard: https://app.netlify.com
- Busca tu sitio: "htk-topolinos" o nombre custom
- Click en "Deploys" tab
- Debe mostrar último deploy con status "Published"
- Build log debe mostrar:
  ```
  v22.16.0 ← Node version
  npm run build:client
  ✓ built in X.XXs
  ```

### 3. Variables de Entorno en Netlify
IMPORTANTE: Verificar que estas estén en Netlify Site Settings:
```
VITE_SUPABASE_URL = https://lvxktbecpvmbcuucjxpp.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_...
VITE_API_URL = https://tu-sitio.netlify.app
```

### 4. Testing Post-Deploy

#### A. Verificar Homepage
```bash
curl https://htk-topolinos.netlify.app
# Debe retornar HTML con <title>HTK Center</title>
```

#### B. Login Test (Profesor)
```
1. Ir a https://htk-topolinos.netlify.app/login
2. Ingresar: profesor@test.com / Profesor123!
3. Debe redirigir a /dashboard
4. Si falla: Check console (F12 → Console tab)
```

#### C. Login Test (Estudiante)
```
1. Ir a /login
2. Ingresar: estudiante@test.com / Estudiante123!
3. Debe redirigir a /dashboard/student
```

#### D. API Endpoints
```bash
curl https://htk-topolinos.netlify.app/.netlify/functions/api/ping
# Debe retornar: {"message":"ping"}
```

## 5. Troubleshooting

| Problema | Solución |
|----------|----------|
| Build falla con "Node version" | Verificar .nvmrc = 22.16.0 (Netlify tarda 5-10min) |
| Login infinito | Check VITE_SUPABASE_URL y ANON_KEY en Netlify env |
| API return 404 | Check netlify/functions/api.ts procesado en build log |
| Sitio no accesible | Esperar 2-3 min para propagación DNS |

## 6. Performance Notes

⚠️ Advertencia normal (no es error):
```
Some chunks are larger than 500 kB after minification
```
Solución post-deploy: Code splitting en Vite config (opcional, Phase 6)

## 📊 Expected Build Output

```
✓ build:client in 1-5s
dist/spa/index.html            0.71 kB
dist/spa/assets/index-*.css    79.26 kB
dist/spa/assets/index-*.js     638.55 kB

[PLUGIN_TIMINGS]
- vite:css (58%)
- vite:build-html (19%)

✓ Functions processed: api.ts
```

## 🎉 Success Indicators

- [ ] Deploy completa sin errores
- [ ] Sitio accesible en HTTPS
- [ ] Login funciona (profesor)
- [ ] Login funciona (estudiante)
- [ ] Dashboard carga
- [ ] API responde (/api/ping)
- [ ] No hay errores en console

---

**Last Updated:** 2026-05-30
**Status:** Ready for production deploy
