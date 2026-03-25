import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('../views/Register.vue'), meta: { guest: true } },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      children: [
        { path: '', redirect: '/files' },
        { path: 'files', component: () => import('../views/Files.vue'), meta: { title: '文件管理' } },
        { path: 'files/list', redirect: '/files' },
        { path: 'system/menu', component: () => import('../views/system/Menu.vue'), meta: { title: '菜单管理' } },
        { path: 'system/role', component: () => import('../views/system/Role.vue'), meta: { title: '角色管理' } },
        { path: 'system/user', component: () => import('../views/system/User.vue'), meta: { title: '用户管理' } },
        { path: 'system/log', component: () => import('../views/system/Log.vue'), meta: { title: '日志管理' } },
        {
          path: 'system/install-package',
          component: () => import('../views/system/InstallPackage.vue'),
          meta: { title: '安装包管理' }
        }
      ]
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  if (to.meta.guest && token) {
    next('/')
  } else if (!to.meta.guest && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
