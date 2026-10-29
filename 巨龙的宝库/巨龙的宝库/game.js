(() => {
  "use strict";

  const MAX_HP = 10;
  const ROUND_COUNT = 5;
  const STONES_PER_HAND = 5;
  const GEM_DAMAGE = 2;

  const state = {
    dragonHp: MAX_HP,
    heroHp: MAX_HP,
    round: 1,
    turn: "dragon",
    selectedIndex: null,
    selectedTarget: "hero",
    dragonHand: [],
    heroHand: [],
    busy: false,
    gameOver: false,
    log: []
  };

  const $ = (id) => document.getElementById(id);
  const dragonHandEl = $("dragonHand");
  const actionButton = $("actionButton");
  const targetHeroButton = $("targetHero");
  const targetSelfButton = $("targetSelf");

  function randomType() {
    return Math.random() < 0.52 ? "gem" : "normal";
  }

  function createHiddenHand() {
    const hand = [];
    for (let i = 0; i < STONES_PER_HAND; i++) {
      hand.push({ type: randomType(), revealed: false });
    }
    // 保持局面明确：每只手至少一颗宝石。
    if (!hand.some((stone) => stone.type === "gem")) {
      hand[Math.floor(Math.random() * hand.length)].type = "gem";
    }
    return hand;
  }

  function addLog(text) {
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
    renderLog();
  }

  function renderLog() {
    const log = $("actionLog");
    log.innerHTML = state.log.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function render() {
    $("dragonHp").textContent = state.dragonHp;
    $("heroHp").textContent = state.heroHp;
    $("dragonHpBar").style.width = `${Math.max(0, state.dragonHp / MAX_HP * 100)}%`;
    $("heroHpBar").style.width = `${Math.max(0, state.heroHp / MAX_HP * 100)}%`;
    $("roundNumber").textContent = state.round;

    const turnPill = $("turnPill");
    turnPill.textContent = state.gameOver ? "对局结束" : state.turn === "dragon" ? "轮到巨龙" : "轮到圣骑士";
    turnPill.classList.toggle("enemy", state.turn === "hero" && !state.gameOver);

    $("dragonStoneCount").textContent = `${state.dragonHand.length}颗剩余`;
    $("heroStoneCount").textContent = `${state.heroHand.length}颗`;

    dragonHandEl.innerHTML = "";
    state.dragonHand.forEach((stone, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stone-card";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", stone.revealed ? `${stone.type === "gem" ? "魔法宝石" : "普通石头"}，已揭示` : `未揭示石头${index + 1}`);
      button.disabled = state.turn !== "dragon" || state.busy || state.gameOver;
      if (state.selectedIndex === index) button.classList.add("selected");

      if (stone.revealed) {
        button.classList.add("revealed", stone.type);
        const img = document.createElement("img");
        img.src = stone.type === "gem" ? "宝石.jpeg" : "石头.jpeg";
        img.alt = stone.type === "gem" ? "魔法宝石" : "普通石头";
        const tag = document.createElement("span");
        tag.className = "reveal-tag";
        tag.textContent = stone.type === "gem" ? "魔法宝石" : "普通石头";
        button.append(img, tag);
      } else {
        const img = document.createElement("img");
        img.src = "石头.jpeg";
        img.alt = "隐藏石头";
        button.appendChild(img);
      }
      button.addEventListener("click", () => selectDragonStone(index));
      dragonHandEl.appendChild(button);
    });

    const heroBacks = $("heroStoneBacks");
    heroBacks.innerHTML = "";
    state.heroHand.forEach(() => {
      const stone = document.createElement("span");
      stone.className = "enemy-stone";
      heroBacks.appendChild(stone);
    });

    const targetDisabled = state.turn !== "dragon" || state.busy || state.gameOver;
    targetHeroButton.disabled = targetDisabled;
    targetSelfButton.disabled = targetDisabled;
    targetHeroButton.classList.toggle("selected", state.selectedTarget === "hero");
    targetSelfButton.classList.toggle("selected", state.selectedTarget === "self");

    actionButton.disabled = state.selectedIndex === null || state.turn !== "dragon" || state.busy || state.gameOver;
    actionButton.textContent = state.selectedIndex === null ? "选择一颗石头" : state.selectedTarget === "self" ? "向自己揭示并行动" : "向圣骑士揭示并行动";
  }

  function selectDragonStone(index) {
    if (state.turn !== "dragon" || state.busy || state.gameOver) return;
    state.selectedIndex = index;
    render();
  }

  function performPlayerAction() {
    if (state.selectedIndex === null || state.turn !== "dragon" || state.busy || state.gameOver) return;
    const index = state.selectedIndex;
    state.selectedIndex = null;
    state.busy = true;
    render();
    resolveAction("dragon", state.selectedTarget === "self" ? "self" : "hero", index);
  }

  function resolveAction(actor, target, index) {
    const hand = actor === "dragon" ? state.dragonHand : state.heroHand;
    if (!hand[index]) return;

    const stone = hand[index];
    stone.revealed = true;
    state.busy = true;

    const actorName = actor === "dragon" ? "巨龙" : "圣骑士";
    const targetName = target === "self" ? "自己" : (actor === "dragon" ? "圣骑士" : "巨龙");
    const attacksSelf = target === "self";

    if (stone.type === "gem") {
      if (attacksSelf) {
        if (actor === "dragon") state.dragonHp = Math.max(0, state.dragonHp - GEM_DAMAGE);
        else state.heroHp = Math.max(0, state.heroHp - GEM_DAMAGE);
      } else if (actor === "dragon") {
        state.heroHp = Math.max(0, state.heroHp - GEM_DAMAGE);
      } else {
        state.dragonHp = Math.max(0, state.dragonHp - GEM_DAMAGE);
      }
      addLog(`${actorName}攻击${targetName}，揭示魔法宝石：造成${GEM_DAMAGE}点伤害！`);
    } else {
      addLog(`${actorName}攻击${targetName}，揭示普通石头：没有造成伤害。`);
    }

    render();
    window.setTimeout(() => {
      hand.splice(index, 1);
      render();
      if (checkImmediateEnd()) return;

      state.busy = false;
      const keepTurn = attacksSelf && stone.type === "normal" && hand.length > 0;
      if (keepTurn) {
        render();
        if (actor === "hero") scheduleHeroAction();
      } else {
        advanceTurn();
      }
    }, 520);
  }

  function advanceTurn() {
    if (state.gameOver) return;

    // 若本局一方没有石头，跳过其回合；双方都没有时进入下一局。
    if (state.dragonHand.length === 0 && state.heroHand.length === 0) {
      beginNextRound();
      return;
    }
    if (state.turn === "dragon" && state.heroHand.length > 0) {
      state.turn = "hero";
      render();
      scheduleHeroAction();
    } else if (state.turn === "hero" && state.dragonHand.length > 0) {
      state.turn = "dragon";
      render();
    } else if (state.turn === "dragon") {
      state.turn = state.heroHand.length > 0 ? "hero" : "dragon";
      if (state.turn === "hero") scheduleHeroAction(); else render();
    } else {
      state.turn = state.dragonHand.length > 0 ? "dragon" : "hero";
      render();
      if (state.turn === "hero") scheduleHeroAction();
    }
  }

  function scheduleHeroAction() {
    if (state.gameOver || state.turn !== "hero") return;
    state.busy = true;
    render();
    window.setTimeout(() => {
      if (state.gameOver) return;
      const index = chooseHeroStone();
      state.busy = false;
      const target = Math.random() < 0.35 ? "self" : "hero";
      resolveAction("hero", target, index);
    }, 650);
  }

  function chooseHeroStone() {
    // 英雄只知道自己的石头是否曾被揭示；未揭示石头一律视为未知，不读取真实类型。
    const unknownIndexes = state.heroHand.map((stone, index) => stone.revealed ? null : index).filter((index) => index !== null);
    const pool = unknownIndexes.length > 0 ? unknownIndexes : state.heroHand.map((_, index) => index);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function beginNextRound() {
    if (state.round >= ROUND_COUNT) {
      finishByScore();
      return;
    }
    state.round += 1;
    state.dragonHand = createHiddenHand();
    state.heroHand = createHiddenHand();
    state.turn = state.round % 2 === 0 ? "hero" : "dragon";
    state.busy = false;
    state.selectedIndex = null;
    state.selectedTarget = "hero";
    addLog(`第${state.round}局开始：双方各获得5颗隐藏石头。`);
    render();
    if (state.turn === "hero") scheduleHeroAction();
  }

  function checkImmediateEnd() {
    if (state.dragonHp <= 0) {
      endGame("hero", "圣骑士攻破宝库！巨龙的守护失败了。");
      return true;
    }
    if (state.heroHp <= 0) {
      endGame("dragon", "圣骑士倒下，宝库继续由巨龙守护！");
      return true;
    }
    return false;
  }

  function finishByScore() {
    if (state.dragonHp > state.heroHp) endGame("dragon", `巨龙以${state.dragonHp}比${state.heroHp}守住宝库。`);
    else if (state.heroHp > state.dragonHp) endGame("hero", `圣骑士以${state.heroHp}比${state.dragonHp}成功挑战宝库。`);
    else endGame("draw", `${state.dragonHp}比${state.heroHp}，双方势均力敌。`);
  }

  function endGame(winner, text) {
    state.gameOver = true;
    state.busy = false;
    render();
    const title = winner === "dragon" ? "巨龙获胜" : winner === "hero" ? "圣骑士获胜" : "势均力敌";
    $("resultTitle").textContent = title;
    $("resultText").textContent = text;
    $("resultIcon").textContent = winner === "dragon" ? "🐉" : winner === "hero" ? "🛡️" : "⚔️";
    if (!$("resultDialog").open) $("resultDialog").showModal();
  }

  function restart() {
    state.dragonHp = MAX_HP;
    state.heroHp = MAX_HP;
    state.round = 1;
    state.turn = "dragon";
    state.selectedIndex = null;
    state.selectedTarget = "hero";
    state.busy = false;
    state.gameOver = false;
    state.log = [];
    state.dragonHand = createHiddenHand();
    state.heroHand = createHiddenHand();
    addLog("对局开始：巨龙先行动。");
    if ($("resultDialog").open) $("resultDialog").close();
    render();
  }

  targetHeroButton.addEventListener("click", () => {
    if (state.turn !== "dragon" || state.busy || state.gameOver) return;
    state.selectedTarget = "hero";
    render();
  });
  targetSelfButton.addEventListener("click", () => {
    if (state.turn !== "dragon" || state.busy || state.gameOver) return;
    state.selectedTarget = "self";
    render();
  });
  actionButton.addEventListener("click", performPlayerAction);
  $("restartButton").addEventListener("click", restart);
  $("rulesButton").addEventListener("click", () => $("rulesDialog").showModal());

  restart();
})();
