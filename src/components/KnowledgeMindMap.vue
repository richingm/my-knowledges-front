<template>
  <div class="mind-map-container">
    <svg 
      ref="svgRef" 
      class="mind-map-svg"
      :viewBox="viewBox"
    >
      <defs>
        <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#6b7280" />
          <stop offset="100%" stop-color="#9ca3af" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- 连接线 -->
      <g class="connections">
        <path
          v-for="(conn, index) in connections"
          :key="'conn-' + index"
          :d="conn.path"
          fill="none"
          stroke="url(#connectionGradient)"
          stroke-width="2"
          class="connection-line"
        />
      </g>
      
      <!-- 节点 -->
      <g 
        v-for="node in nodes" 
        :key="node.id"
        class="node-group"
        :transform="`translate(${node.x}, ${node.y})`"
        @click="handleNodeClick(node)"
      >
        <!-- 节点背景 -->
        <rect
          :width="node.width"
          :height="node.height"
          :rx="node.radius"
          :ry="node.radius"
          :fill="node.bgColor"
          :stroke="node.borderColor"
          stroke-width="2"
          filter="url(#shadow)"
        />
        <!-- 节点文字 -->
        <text
          :x="node.width / 2"
          :y="node.height / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="node.textColor"
          font-size="14"
          font-weight="500"
        >
          {{ node.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const props = defineProps({
  treeData: {
    type: Array,
    default: () => []
  },
  selectedKnowledgeId: {
    type: [Number, String],
    default: null
  },
  articleTree: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['knowledge-click', 'article-click']);

const svgRef = ref(null);

// 重要程度颜色映射
const levelColors = {
  1: { bg: '#9ca3af', text: '#ffffff', border: '#6b7280' },  // 灰色（不重要）
  2: { bg: '#f97316', text: '#ffffff', border: '#ea580c' },  // 橙色（不太重要）
  3: { bg: '#3b82f6', text: '#ffffff', border: '#2563eb' },  // 蓝色（一般）
  4: { bg: '#a855f7', text: '#ffffff', border: '#9333ea' },  // 紫色（比较重要）
  5: { bg: '#ef4444', text: '#ffffff', border: '#dc2626' }   // 红色（非常重要）
};

// 根据parentId构建文章树形结构
const buildArticleTree = (articles) => {
  if (!articles || articles.length === 0) return [];
  
  const articleMap = new Map();
  const tree = [];
  
  articles.forEach(article => {
    articleMap.set(article.id, { ...article, children: [] });
  });
  
  articles.forEach(article => {
    const node = articleMap.get(article.id);
    const parentId = article.parentId !== undefined ? article.parentId : article.parentArticleId;
    
    if (parentId && parentId !== 0) {
      const parent = articleMap.get(parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        tree.push(node);
      }
    } else {
      tree.push(node);
    }
  });
  
  return tree;
};

// 计算节点和连接线数据
const mindMapData = computed(() => {
  if (!props.selectedKnowledgeId || !props.articleTree || props.articleTree.length === 0) {
    return {
      nodes: [{
        id: 'empty',
        label: '请先选择知识库',
        x: 400,
        y: 300,
        width: 180,
        height: 50,
        radius: 8,
        bgColor: '#e5e7eb',
        borderColor: '#d1d5db',
        textColor: '#4b5563',
        type: 'empty'
      }],
      connections: []
    };
  }
  
  // 查找选中的知识库名称
  let knowledgeName = '知识库';
  const findKnowledge = (nodes, id) => {
    for (const node of nodes) {
      if (String(node.id) === String(id)) return node;
      if (node.children && node.children.length > 0) {
        const found = findKnowledge(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  
  const selectedKnowledge = findKnowledge(props.treeData, props.selectedKnowledgeId);
  if (selectedKnowledge) {
    knowledgeName = selectedKnowledge.name;
  }
  
  const articleTree = buildArticleTree(props.articleTree);
  const nodes = [];
  const connections = [];
  
  // 根节点（知识库）
  const rootNode = {
    id: 'root',
    label: knowledgeName.length > 12 ? knowledgeName.substring(0, 12) + '...' : knowledgeName,
    x: 100,
    y: 300,
    width: Math.max(120, knowledgeName.length * 12),
    height: 50,
    radius: 8,
    bgColor: '#10b981',
    borderColor: '#059669',
    textColor: '#ffffff',
    type: 'knowledge',
    knowledgeId: props.selectedKnowledgeId
  };
  nodes.push(rootNode);
  
  // 递归生成文章节点
  const spacing = 70;
  const levelSpacing = 180;
  
  const generateNodes = (articles, parentX, parentY, level = 1) => {
    if (!articles || articles.length === 0) return;
    
    const totalHeight = articles.length * spacing;
    const startY = parentY - (totalHeight - spacing) / 2;
    
    articles.forEach((article, index) => {
      const x = parentX + levelSpacing;
      const y = startY + index * spacing;
      
      const title = article.title || article.name || '未命名';
      const label = title.length > 15 ? title.substring(0, 15) + '...' : title;
      const levelConfig = levelColors[article.level] || levelColors[3];
      
      const node = {
        id: `article-${article.id}`,
        label: label,
        x: x,
        y: y,
        width: Math.max(100, label.length * 11),
        height: 42,
        radius: 6,
        bgColor: levelConfig.bg,
        borderColor: levelConfig.border,
        textColor: levelConfig.text,
        type: 'article',
        articleId: article.id
      };
      nodes.push(node);
      
      // 添加连接线
      connections.push({
        path: `M ${parentX + (level === 1 ? rootNode.width : 100)} ${parentY} C ${parentX + levelSpacing / 2} ${parentY}, ${x - levelSpacing / 2} ${y}, ${x} ${y}`
      });
      
      // 递归处理子文章
      if (article.children && article.children.length > 0) {
        generateNodes(article.children, x, y, level + 1);
      }
    });
  };
  
  generateNodes(articleTree, rootNode.x, rootNode.y);
  
  return { nodes, connections };
});

const nodes = computed(() => mindMapData.value.nodes);
const connections = computed(() => mindMapData.value.connections);

// 计算 viewBox
const viewBox = computed(() => {
  const padding = 50;
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  nodes.value.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y - node.height / 2);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height / 2);
  });
  
  return `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
});

const handleNodeClick = (node) => {
  if (node.type === 'article') {
    emit('article-click', { id: node.articleId });
  } else if (node.type === 'knowledge') {
    emit('knowledge-click', { id: node.knowledgeId });
  }
};

onMounted(() => {
  // 组件已挂载
});
</script>

<style scoped>
.mind-map-container {
  width: 100%;
  height: calc(100vh - 100px);
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  overflow: auto;
}

.mind-map-svg {
  width: 100%;
  height: 100%;
}

.node-group {
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.node-group:hover {
  opacity: 0.9;
}

.connection-line {
  transition: stroke 0.2s;
}
</style>
