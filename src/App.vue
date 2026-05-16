<script setup>
import { ref, onMounted, watch, onUnmounted, shallowRef, nextTick } from 'vue';
import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
import '@wangeditor/editor/dist/css/style.css';
import { domainService } from './services/domainService';
import { knowledgeService } from './services/knowledgeService';
import { articleService } from './services/articleService';
import KnowledgeTree from './components/KnowledgeTree.vue';
import ArticleTree from './components/ArticleTree.vue';
import KnowledgeMindMap from './components/KnowledgeMindMap.vue';

const domains = ref([]);
const selectedDomain = ref(null);
const knowledgeTree = ref([]);
const articleTree = ref([]);
const selectedKnowledge = ref(null);
const selectedArticle = ref(null);
const articleDetail = ref(null);
const editableArticle = ref(null);
const mode = ref('default');
const viewMode = ref('tree');
const knowledgeCollapsed = ref(false);
const articleCollapsed = ref(false);

const toolbarConfig = {
  excludeKeys: [
    'fullscreen',
    'group-video',
    'insertVideo'
  ]
};

const editorConfig = {
  placeholder: '请输入文章内容...',
  autoFocus: true,
  MENU_CONF: {
    uploadImage: {
      server: '/api/v1/upload/image',
      fieldName: 'image',
      maxFileSize: 5 * 1024 * 1024
    }
  }
};

const editorRef = ref(null);
const editorCreated = ref(false);

const notification = ref({
  show: false,
  message: '',
  type: 'success'
});

const previewImage = ref({
  show: false,
  src: '',
  scale: 1
});

const showNotification = (message, type = 'success') => {
  notification.value = {
    show: true,
    message,
    type
  };
  setTimeout(() => {
    notification.value.show = false;
  }, 3000);
};

const moveKnowledge = async (knowledgeId, newParentId) => {
  const result = await knowledgeService.moveKnowledge(knowledgeId, newParentId, selectedDomain.value?.id);
  if (result && result.success) {
    if (selectedDomain.value?.id) {
      await fetchKnowledgeTree(selectedDomain.value.id);
    }
    showNotification('知识库移动成功!', 'success');
  } else {
    showNotification('知识库移动失败!', 'error');
  }
};

const generateKnowledgeOptions = (nodes, level = 0) => {
  let options = [];
  const indent = '  '.repeat(level);
  nodes.forEach(node => {
    options.push({
      value: node.id,
      label: `${indent}${node.name}`
    });
    if (node.children && node.children.length > 0) {
      options = options.concat(generateKnowledgeOptions(node.children, level + 1));
    }
  });
  return options;
};

const handleMoveKnowledge = (knowledgeId) => {
  const knowledgeOptions = generateKnowledgeOptions(knowledgeTree.value);
  const confirmed = confirm('确定移动此知识库吗？');
  if (confirmed) {
    moveKnowledge(knowledgeId, 0);
  }
};

const moveArticle = async (articleId, newParentId) => {
  const result = await articleService.moveArticle(articleId, newParentId, selectedKnowledge.value?.id);
  if (result && result.success) {
    if (selectedKnowledge.value?.id) {
      await fetchArticleTree(selectedKnowledge.value.id);
    }
    showNotification('文章移动成功!', 'success');
  } else {
    showNotification('文章移动失败!', 'error');
  }
};

const handleMoveArticle = (articleId) => {
  const confirmed = confirm('确定移动此文章到根目录吗？');
  if (confirmed) {
    moveArticle(articleId, 0);
  }
};

const fetchDomains = async () => {
  try {
    const result = await domainService.listDomains();
    if (result && Array.isArray(result)) {
      domains.value = result;
    }
  } catch (error) {
    console.error('获取领域列表失败:', error);
  }
};

const fetchKnowledgeTree = async (domainId) => {
  try {
    const result = await knowledgeService.getKnowledgeTree(domainId);
    if (result && Array.isArray(result)) {
      knowledgeTree.value = result;
    } else {
      knowledgeTree.value = [];
    }
  } catch (error) {
    console.error('获取知识库树失败:', error);
  }
};

const fetchArticleTree = async (knowledgeId) => {
  try {
    const result = await articleService.getArticleTree(knowledgeId);
    if (result && Array.isArray(result)) {
      articleTree.value = result;
    } else {
      articleTree.value = [];
    }
  } catch (error) {
    console.error('获取文章树失败:', error);
  }
};

const fetchArticle = async (articleId) => {
  try {
    const result = await articleService.getArticle(articleId);
    console.log('Article API response:', result);
    if (result) {
      const importance = result.importance || result.Importance;
      const level = result.level || result.Level;
      const mappedImportance = importance || (level ? `${level}` : '3');
      
      const article = {
        id: result.id || result.ID || result.Id,
        title: result.title || result.Title || result.name || result.Name || '无标题',
        content: result.content || result.Content || result.body || result.Body || result.html || '',
        importance: mappedImportance
      };
      console.log('Mapped article:', article);
      articleDetail.value = article;
      editableArticle.value = { ...article };
      mode.value = 'view';
    }
  } catch (error) {
    console.error('获取文章失败:', error);
  }
};

const handleDomainChange = async (event) => {
  const domainId = event.target.value;
  const domain = domains.value.find(d => d.id && d.id.toString() === domainId);
  if (domain) {
    selectedDomain.value = domain;
    localStorage.setItem('selectedDomainId', domainId.toString());
    await fetchKnowledgeTree(domainId);
    selectedKnowledge.value = null;
    selectedArticle.value = null;
    articleDetail.value = null;
    editableArticle.value = null;
    articleTree.value = [];
  }
};

const handleKnowledgeClick = async (knowledge) => {
  selectedKnowledge.value = knowledge;
  localStorage.setItem('selectedKnowledgeId', knowledge.id.toString());
  
  knowledgeTree.value = toggleExpand(knowledgeTree.value, knowledge.id.toString());
  
  await fetchArticleTree(knowledge.id);
  selectedArticle.value = null;
  articleDetail.value = null;
  editableArticle.value = null;
};

const toggleExpand = (nodes, targetId) => {
  return nodes.map(node => {
    const isTarget = node.id && node.id.toString() === targetId;
    const newNode = {
      ...node,
      expanded: isTarget ? !node.expanded : node.expanded
    };
    if (node.children && node.children.length > 0) {
      newNode.children = toggleExpand(node.children, targetId);
    }
    return newNode;
  });
};

const handleArticleClick = async (article) => {
  selectedArticle.value = article;
  localStorage.setItem('selectedArticleId', article.id.toString());
  
  articleTree.value = toggleExpand(articleTree.value, article.id.toString());
  
  await fetchArticle(article.id);
};

const handleMindMapKnowledgeClick = (knowledge) => {
  handleKnowledgeClick(knowledge);
  viewMode.value = 'tree';
};

const handleMindMapArticleClick = (article) => {
  handleArticleClick(article);
  viewMode.value = 'tree';
};

const handleCreateKnowledge = async (parentId = null) => {
  const name = prompt('请输入知识库名称');
  if (!name) return;
  
  const description = prompt('请输入知识库描述（可选）');
  
  try {
    const result = await knowledgeService.createKnowledge(
      selectedDomain.value?.id,
      parentId ? parseInt(parentId) : 0,
      name,
      description || ''
    );
    
    if (result) {
      await fetchKnowledgeTree(selectedDomain.value?.id);
      showNotification('知识库创建成功!', 'success');
    }
  } catch (error) {
    console.error('创建知识库失败:', error);
    showNotification('创建知识库失败!', 'error');
  }
};

const handleUpdateKnowledge = async (knowledgeId, name, description) => {
  try {
    const result = await knowledgeService.updateKnowledge(
      knowledgeId,
      selectedDomain.value?.id,
      name,
      description
    );
    
    if (result) {
      await fetchKnowledgeTree(selectedDomain.value?.id);
      showNotification('知识库更新成功!', 'success');
    }
  } catch (error) {
    console.error('更新知识库失败:', error);
    showNotification('更新知识库失败!', 'error');
  }
};

const handleDeleteKnowledge = async (knowledgeId) => {
  if (!confirm('确定删除此知识库吗？这将删除所有子知识库和文章！')) {
    return;
  }
  
  try {
    await knowledgeService.deleteKnowledge(knowledgeId);
    await fetchKnowledgeTree(selectedDomain.value?.id);
    
    if (selectedKnowledge.value?.id === knowledgeId) {
      selectedKnowledge.value = null;
      selectedArticle.value = null;
      articleDetail.value = null;
      editableArticle.value = null;
      articleTree.value = [];
    }
    
    showNotification('知识库删除成功!', 'success');
  } catch (error) {
    console.error('删除知识库失败:', error);
    showNotification('删除知识库失败!', 'error');
  }
};

const handleCreateArticle = async (parentArticleId = null) => {
  if (!selectedKnowledge.value) {
    showNotification('请先选择一个知识库!', 'error');
    return;
  }
  
  try {
    const result = await articleService.createArticle({
      knowledge_id: selectedKnowledge.value.id,
      title: '',
      content: '',
      parent_article_id: parentArticleId ? parseInt(parentArticleId) : 0,
      level: 3
    });
    
    if (result && result.id) {
      await fetchArticleTree(selectedKnowledge.value.id);
      
      const newArticleId = result.id.toString();
      selectedArticle.value = findArticleById(articleTree.value, newArticleId);
      
      if (selectedArticle.value) {
        localStorage.setItem('selectedArticleId', newArticleId);
        
        articleDetail.value = {
          id: result.id,
          title: '',
          content: '',
          level: 3,
        };
        editableArticle.value = { ...articleDetail.value };
        mode.value = 'edit';
      }
      
      showNotification('文章创建成功!', 'success');
    } else {
      showNotification('创建文章失败，未返回文章ID!', 'error');
    }
  } catch (error) {
    console.error('创建文章失败:', error);
    showNotification('创建文章失败!', 'error');
  }
};

const findArticleById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id && node.id.toString() === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findArticleById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

const handleUpdateArticle = async () => {
  if (!editableArticle.value) return;
  
  try {
    const editor = editorRef.value;
    const content = editor ? editor.getHtml() : editableArticle.value.content;
    
    const result = await articleService.updateArticle(
      editableArticle.value.id,
      {
        knowledge_id: selectedKnowledge.value?.id,
        title: editableArticle.value.title,
        content: content,
        level: parseInt(editableArticle.value.level?.replace('level-', '') || '3')
      }
    );
    
    if (result) {
      articleDetail.value = { ...editableArticle.value, content };
      mode.value = 'view';
      await fetchArticleTree(selectedKnowledge.value?.id);
      showNotification('文章更新成功!', 'success');
    }
  } catch (error) {
    console.error('更新文章失败:', error);
    showNotification('更新文章失败!', 'error');
  }
};

const handleDeleteArticle = async (articleId) => {
  if (!confirm('确定删除此文章吗？')) {
    return;
  }
  
  try {
    await articleService.deleteArticle(articleId);
    await fetchArticleTree(selectedKnowledge.value?.id);
    
    if (selectedArticle.value?.id === articleId) {
      selectedArticle.value = null;
      articleDetail.value = null;
      editableArticle.value = null;
    }
    
    showNotification('文章删除成功!', 'success');
  } catch (error) {
    console.error('删除文章失败:', error);
    showNotification('删除文章失败!', 'error');
  }
};

const startEdit = () => {
  mode.value = 'edit';
};

const cancelEdit = () => {
  mode.value = 'view';
  editableArticle.value = { ...articleDetail.value };
};

const getImportanceColor = (importance) => {
  const colorMap = {
    '1': '#28a745',
    '2': '#fd7e14',
    '3': '#ffc107',
    '4': '#6f42c1',
    '5': '#dc3545'
  };
  return colorMap[importance] || '#6c757d';
};

const getImportanceText = (importance) => {
  const textMap = {
    '1': '非常重要',
    '2': '比较重要',
    '3': '一般',
    '4': '不太重要',
    '5': '不重要'
  };
  return textMap[importance] || '未设置';
};

const handleEditorCreated = (editor) => {
  editorRef.value = Object.seal(editor);
  editorCreated.value = true;
};

const openImagePreview = (src) => {
  previewImage.value = {
    show: true,
    src: src,
    scale: 1
  };
};

const closeImagePreview = () => {
  previewImage.value.show = false;
};

const zoomImage = (delta) => {
  previewImage.value.scale = Math.max(0.1, Math.min(3, previewImage.value.scale + delta));
};

const handleImageDoubleClick = (event) => {
  const target = event.target;
  if (target.tagName === 'IMG') {
    openImagePreview(target.src);
  }
};

const initData = async () => {
  await fetchDomains();
  
  const savedDomainId = localStorage.getItem('selectedDomainId');
  if (savedDomainId) {
    const domain = domains.value.find(d => d.id && d.id.toString() === savedDomainId);
    if (domain) {
      selectedDomain.value = domain;
      await fetchKnowledgeTree(parseInt(savedDomainId));
      
      const savedKnowledgeId = localStorage.getItem('selectedKnowledgeId');
      if (savedKnowledgeId) {
        const knowledge = findKnowledgeById(knowledgeTree.value, savedKnowledgeId);
        if (knowledge) {
          selectedKnowledge.value = knowledge;
          knowledgeTree.value = toggleExpand(knowledgeTree.value, savedKnowledgeId);
          await fetchArticleTree(parseInt(savedKnowledgeId));
          
          const savedArticleId = localStorage.getItem('selectedArticleId');
          if (savedArticleId) {
            const article = findArticleById(articleTree.value, savedArticleId);
            if (article) {
              selectedArticle.value = article;
              articleTree.value = toggleExpand(articleTree.value, savedArticleId);
              await fetchArticle(parseInt(savedArticleId));
            }
          }
        }
      }
    }
  } else if (domains.value.length > 0) {
    selectedDomain.value = domains.value[0];
    localStorage.setItem('selectedDomainId', domains.value[0].id.toString());
    await fetchKnowledgeTree(domains.value[0].id);
  }
};

const findKnowledgeById = (nodes, id) => {
  for (const node of nodes) {
    if (node.id && node.id.toString() === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findKnowledgeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

onMounted(async () => {
  await initData();
  document.addEventListener('dblclick', handleImageDoubleClick);
});

onUnmounted(() => {
  document.removeEventListener('dblclick', handleImageDoubleClick);
  const editor = editorRef.value;
  if (editor) {
    editor.destroy();
    editorRef.value = null;
  }
});
</script>

<template>
  <div class="app-container">
    <div v-if="notification.show" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
    
    <header class="header">
      <div class="header-left">
        <select v-if="domains.length > 0" :value="selectedDomain?.id" @change="handleDomainChange" class="domain-select">
          <option v-for="domain in domains" :key="domain.id" :value="domain.id">
            {{ domain.name }}
          </option>
        </select>
      </div>
      <div class="header-right">
        <div class="view-toggle">
          <button :class="['view-btn', { active: viewMode === 'tree' }]" @click="viewMode = 'tree'">
            📋 树视图
          </button>
          <button :class="['view-btn', { active: viewMode === 'mindmap' }]" @click="viewMode = 'mindmap'">
            🧠 脑图视图
          </button>
        </div>
      </div>
    </header>
    
    <main class="main">
      <div v-if="viewMode === 'tree'" class="three-column-layout">
        <div :class="['column column-1', { collapsed: knowledgeCollapsed }]">
          <div class="column-header">
            <h2>知识库</h2>
            <div class="header-actions">
              <button @click="knowledgeCollapsed = !knowledgeCollapsed" class="collapse-btn">
                {{ knowledgeCollapsed ? '▶' : '▼' }}
              </button>
              <button @click="handleCreateKnowledge()" class="create-btn">+ 新建</button>
            </div>
          </div>
          <KnowledgeTree 
            v-show="!knowledgeCollapsed"
            :tree-data="knowledgeTree" 
            :selected-id="selectedKnowledge?.id"
            @node-click="handleKnowledgeClick"
            @create-child="handleCreateKnowledge"
            @move-node="handleMoveKnowledge"
            @delete-node="handleDeleteKnowledge"
            @update-node="handleUpdateKnowledge"
          />
        </div>
        
        <div :class="['column column-2', { collapsed: articleCollapsed }]">
          <div class="column-header">
            <h2>文章</h2>
            <div class="header-actions">
              <button @click="articleCollapsed = !articleCollapsed" class="collapse-btn">
                {{ articleCollapsed ? '▶' : '▼' }}
              </button>
              <button @click="handleCreateArticle()" class="create-btn" :disabled="!selectedKnowledge">+ 新建</button>
            </div>
          </div>
          <ArticleTree 
            v-show="!articleCollapsed"
            :tree-data="articleTree" 
            :selected-id="selectedArticle?.id"
            @node-click="handleArticleClick"
            @create-child="handleCreateArticle"
            @move-node="handleMoveArticle"
            @delete-node="handleDeleteArticle"
          />
        </div>
        
        <div class="column column-3">
          <div v-if="articleDetail" class="article-detail">
            <div class="article-header">
              <div class="article-title-row">
                <h1 v-if="mode === 'view'">{{ articleDetail.title }}</h1>
                <input 
                  v-else 
                  v-model="editableArticle.title" 
                  class="title-input"
                />
              </div>
              <div class="article-meta">
                <div class="importance-selector">
                  <span class="importance-label">重要程度:</span>
                  <div v-if="mode === 'view'" class="importance-badge" :style="{ backgroundColor: getImportanceColor(articleDetail.importance) }">
                    {{ getImportanceText(articleDetail.level) }}
                  </div>
                  <select v-else v-model="editableArticle.importance" class="importance-select">
                    <option value="1">非常重要</option>
                    <option value="2">比较重要</option>
                    <option value="3">一般</option>
                    <option value="4">不太重要</option>
                    <option value="5">不重要</option>
                  </select>
                </div>
                <div class="article-actions">
                  <button v-if="mode === 'view'" @click="startEdit" class="edit-btn">编辑</button>
                  <button v-if="mode === 'edit'" @click="handleUpdateArticle" class="save-btn">保存</button>
                  <button v-if="mode === 'edit'" @click="cancelEdit" class="cancel-btn">取消</button>
                  <button v-if="mode === 'view'" @click="handleDeleteArticle(articleDetail.id)" class="delete-btn">删除</button>
                </div>
              </div>
            </div>
            <div class="article-content">
              <div v-if="mode === 'view'" v-html="articleDetail.content" class="content-view"></div>
              <div v-else class="editor-wrapper">
                <Toolbar 
                  style="border-bottom: 1px solid #ccc"
                  :editor="editorRef" 
                  :default-config="toolbarConfig" 
                  :mode="mode"
                />
                <Editor 
                  style="flex: 1; overflow-y: hidden;"
                  v-model="editableArticle.content" 
                  :default-config="editorConfig"
                  :mode="mode"
                  @on-created="handleEditorCreated"
                />
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <div class="empty-icon">📄</div>
            <p>请选择一篇文章查看详情</p>
          </div>
        </div>
      </div>
      
      <div v-if="viewMode === 'mindmap'" class="mindmap-container">
        <KnowledgeMindMap 
          :knowledge-tree="knowledgeTree"
          :article-tree="articleTree"
          :selected-knowledge="selectedKnowledge"
          :selected-article="selectedArticle"
          @knowledge-click="handleMindMapKnowledgeClick"
          @article-click="handleMindMapArticleClick"
        />
      </div>
    </main>
    
    <div v-if="previewImage.show" class="image-preview-overlay" @click="closeImagePreview">
      <div class="image-preview-container" @click.stop>
        <button class="close-btn" @click="closeImagePreview">&times;</button>
        <div class="image-controls">
          <button @click="zoomImage(-0.1)" class="zoom-btn">-</button>
          <span class="zoom-level">{{ Math.round(previewImage.scale * 100) }}%</span>
          <button @click="zoomImage(0.1)" class="zoom-btn">+</button>
        </div>
        <img 
          :src="previewImage.src" 
          alt="预览图片" 
          class="preview-image"
          :style="{ transform: `scale(${previewImage.scale})` }"
        />
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
}

.notification.success {
  background-color: #28a745;
}

.notification.error {
  background-color: #dc3545;
}

@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}

.header {
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
}

.domain-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.view-toggle {
  display: flex;
  gap: 0.25rem;
}

.view-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  background-color: white;
  transition: all 0.2s;
}

.view-btn:hover {
  background-color: #e9ecef;
}

.view-btn.active {
  background-color: #007bff;
  color: white;
  border-color: #007bff;
}

.main {
  flex: 1;
  overflow: hidden;
}

.three-column-layout {
  display: flex;
  height: 100%;
}

.column {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e9ecef;
  overflow: hidden;
}

.column-1 {
  flex: 2;
  min-width: 40px;
  max-width: 350px;
  transition: flex 0.3s ease, min-width 0.3s ease;
}

.column-2 {
  flex: 2;
  min-width: 40px;
  max-width: 350px;
  transition: flex 0.3s ease, min-width 0.3s ease;
}

.column-1.collapsed,
.column-2.collapsed {
  flex: 0 0 40px;
  min-width: 40px;
}

.column.collapsed .column-header h2 {
  display: none;
}

.column.collapsed .header-actions .create-btn {
  display: none;
}

.column-3 {
  flex: 4;
  min-width: 400px;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.collapse-btn {
  width: 24px;
  height: 24px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.collapse-btn:hover {
  background-color: #e9ecef;
}

.column-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.create-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #28a745;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  background-color: white;
  color: #28a745;
  transition: all 0.2s;
}

.create-btn:hover:not(:disabled) {
  background-color: #28a745;
  color: white;
}

.create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.article-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.article-header {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  background-color: #f8f9fa;
}

.article-title-row {
  margin-bottom: 0.75rem;
}

.article-title-row h1 {
  margin: 0;
  font-size: 1.25rem;
}

.title-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1.25rem;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.importance-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.importance-label {
  font-size: 0.875rem;
  color: #6c757d;
}

.importance-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: white;
}

.importance-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.875rem;
}

.article-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn, .save-btn, .cancel-btn, .delete-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn {
  border-color: #007bff;
  color: #007bff;
  background-color: white;
}

.edit-btn:hover {
  background-color: #007bff;
  color: white;
}

.save-btn {
  border-color: #28a745;
  color: #28a745;
  background-color: white;
}

.save-btn:hover {
  background-color: #28a745;
  color: white;
}

.cancel-btn {
  border-color: #6c757d;
  color: #6c757d;
  background-color: white;
}

.cancel-btn:hover {
  background-color: #6c757d;
  color: white;
}

.delete-btn {
  border-color: #dc3545;
  color: #dc3545;
  background-color: white;
}

.delete-btn:hover {
  background-color: #dc3545;
  color: white;
}

.article-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.content-view {
  line-height: 1.8;
  color: #333;
  font-size: 15px;
  padding: 1rem;
}

.content-view h1 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 1.5rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #eee;
}

.content-view h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 1.25rem 0 0.75rem;
}

.content-view h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
}

.content-view p {
  margin: 0.75rem 0;
  text-indent: 2em;
}

.content-view ul, .content-view ol {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.content-view li {
  margin: 0.25rem 0;
}

.content-view a {
  color: #007bff;
  text-decoration: none;
}

.content-view a:hover {
  text-decoration: underline;
}

.content-view img {
  max-width: 100%;
  height: auto;
  cursor: pointer;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.content-view blockquote {
  border-left: 4px solid #007bff;
  padding: 0.5rem 1rem;
  margin: 1rem 0;
  background-color: #f8f9fa;
  font-style: italic;
  color: #6c757d;
}

.content-view code {
  background-color: #f4f4f4;
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.content-view pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1rem 0;
}

.content-view pre code {
  background: none;
  padding: 0;
}

.editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-wrapper :deep(.w-e-toolbar) {
  flex-shrink: 0;
}

.editor-wrapper :deep(.w-e-text-container) {
  flex: 1;
  overflow: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #6c757d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.mindmap-container {
  height: 100%;
  padding: 1rem;
}

.image-preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  cursor: pointer;
}

.image-preview-container {
  position: relative;
  max-width: 90%;
  max-height: 90%;
  cursor: default;
}

.close-btn {
  position: absolute;
  top: -40px;
  right: 0;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.4);
}

.image-controls {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.zoom-btn {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.8);
  color: #333;
  font-size: 1.25rem;
  cursor: pointer;
}

.zoom-level {
  color: white;
  font-size: 0.875rem;
  min-width: 50px;
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  transition: transform 0.2s ease;
}
</style>
