import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import GameView from "@/views/GameView.vue";
import RuleView from "@/views/RuleView.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/game", name: "game", component: GameView },
    { path: "/rule", name: "rule", component: RuleView },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

export default router;
