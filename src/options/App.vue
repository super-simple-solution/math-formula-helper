
<script setup>
import { ref } from 'vue'
import { siderMenuList } from './const'

const activeMenu = ref(siderMenuList[0].value)
</script>
<template>
  <div class="sss-flex sss-justify-center sss-h-screen">
     <div class="sss-flex">
      <div class="sss-py-10 sss-border-r sss-border-gray-200 sss-pr-10 sss-w-[300px]">
        <div class="sss-flex sss-items-center sss-pl-2">
          <img src="/assets/icons/128.png" alt="logo" class="sss-w-10">
          <div class="sss-ml-4 sss-font-bold sss-text-xl">Latex Copy</div>
        </div>
        <div class="sss-mt-4 sss-text-base sss-option-siderbar">
          <div
            :class="['sss-py-2 sss-px-3 sss-cursor-pointer', activeMenu === item.value ? 'sss-bg-blue-100 sss-text-blue-600 sss-rounded-lg' : '']" v-for="item in siderMenuList" :key="item.value"
            @click="() => activeMenu = item.value"
          >
            {{ item.label }}
          </div>
        </div>
      </div>
      <div class="sss-py-10 sss-pl-24 sss-w-[600px]">
        <div v-if="activeMenu === 'tooltip'">
          <div class="sss-text-xl sss-font-bold">提示框信息</div>
          <div class="sss-mt-8 sss-rounded-lg sss-overflow-hidden sss-shadow">
            <div class="sss-bg-slate-200 sss-px-10 sss-pt-10">
              <img src="/assets/images/tooltip-demo.png" alt="" class="sss-rounded-t-md">
            </div>
            <div class="sss-flex sss-justify-between sss-p-4">
              <div class="sss-text-base">鼠标hover到Latex上时显示</div>
              <label class="switch">
                <input type="checkbox" id="tooltipSwitch" checked>
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>
        <div v-if="activeMenu === 'dollar'">
          <div class="sss-text-xl sss-font-bold">$$信息</div>
        </div>
        <div v-if="activeMenu === 'feedback'">
          <div>
            <input type="textarea" class="sss-border sss-border-gray-100">
            <div>
              <div>邮箱</div>
              <input type="email">
            </div>
            <button>提交</button>
            <div>请填写问题描述后再提交</div>
          </div>
        </div>
      </div>
     </div>
    </div>
</template>
