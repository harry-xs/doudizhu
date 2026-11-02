<template>
  <div class="rule felt-bg">
    <header class="rule__header">
      <button type="button" class="back-btn" @click="router.back()">←</button>
      <h1>游戏规则</h1>
      <span class="rule__spacer"></span>
    </header>

    <main class="rule__body">
      <section class="card glass">
        <h2 class="card__title">基本玩法</h2>
        <ul class="points">
          <li>三人对局：1 名玩家 + 2 名电脑，1 地主、2 农民，农民互为队友。</li>
          <li>每人 17 张牌，底牌 3 张；叫到地主的人获得底牌并先出牌。</li>
          <li>三家都不叫地主，则自动重新发牌。</li>
          <li>地主先出完牌 → 地主胜；任意农民先出完牌 → 农民胜。</li>
          <li>炸弹与王炸都会让本局倍数翻倍。</li>
        </ul>
      </section>

      <section class="card glass">
        <h2 class="card__title">牌型说明</h2>
        <ul class="patterns">
          <li v-for="item in patterns" :key="item.name" class="pattern">
            <div class="pattern__head">
              <span class="pattern__name">{{ item.name }}</span>
              <span class="pattern__example">{{ item.example }}</span>
            </div>
            <p class="pattern__desc">{{ item.desc }}</p>
          </li>
        </ul>
      </section>

      <section class="card glass">
        <h2 class="card__title">比较规则</h2>
        <ul class="points">
          <li>王炸 &gt; 炸弹 &gt; 所有普通牌型。</li>
          <li>普通牌型需同类型、同张数才能比较大小。</li>
          <li>顺子、连对、飞机不能包含 2、小王、大王。</li>
          <li>比较看主控点数：顺子看最大牌，三带看三张点数。</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const patterns = [
  { name: "单张", example: "3", desc: "任意一张牌" },
  { name: "对子", example: "7 7", desc: "两张点数相同的牌" },
  { name: "三张", example: "9 9 9", desc: "三张点数相同的牌" },
  { name: "三带一", example: "9 9 9 + 4", desc: "三张 + 任意一张单牌" },
  { name: "三带对", example: "9 9 9 + 4 4", desc: "三张 + 任意一对" },
  {
    name: "顺子",
    example: "3 4 5 6 7",
    desc: "至少 5 张连续单牌，不含 2 和王",
  },
  {
    name: "连对",
    example: "33 44 55",
    desc: "至少 3 组连续对子，不含 2 和王",
  },
  {
    name: "飞机",
    example: "333 444",
    desc: "至少 2 组连续三张，可带同数量单牌或对子，不含 2 和王",
  },
  { name: "炸弹", example: "8 8 8 8", desc: "四张点数相同的牌，可压普通牌型" },
  { name: "王炸", example: "小王 + 大王", desc: "最大牌型，可压一切" },
];
</script>

<style scoped>
.rule {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.rule__header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
  background: rgba(10, 48, 32, 0.82);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.rule__header h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.rule__spacer {
  width: 38px;
}

.back-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 18px;
  line-height: 1;
}

.rule__body {
  flex: 1;
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 16px 16px calc(28px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  border-radius: 18px;
  padding: 16px 16px 14px;
}

.card__title {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 800;
  color: #ffd75e;
}

.points {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.82);
}

.points li::marker {
  color: rgba(212, 175, 55, 0.8);
}

.patterns {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pattern {
  padding: 9px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.pattern__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.pattern__name {
  font-size: 14px;
  font-weight: 700;
}

.pattern__example {
  font-size: 12px;
  color: #ffd75e;
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.pattern__desc {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
}
</style>
