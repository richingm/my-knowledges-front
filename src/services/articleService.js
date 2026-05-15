export const articleService = {
  async getArticleTree(knowledgeId) {
    try {
      const response = await fetch(`/api/v1/article-tree?knowledge_id=${knowledgeId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch article tree');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching article tree:', error);
      return [];
    }
  },
  
  async getArticle(articleId) {
    try {
      const response = await fetch(`/api/v1/articles/${articleId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  },
  
  async createArticle(articleData) {
    try {
      const response = await fetch('/api/v1/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleData)
      });
      if (!response.ok) {
        throw new Error('Failed to create article');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating article:', error);
      return null;
    }
  },
  
  async updateArticle(articleId, articleData) {
    try {
      const response = await fetch(`/api/v1/articles/${articleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(articleData)
      });
      if (!response.ok) {
        throw new Error('Failed to update article');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating article:', error);
      return null;
    }
  },
  
  async deleteArticle(articleId) {
    try {
      const response = await fetch(`/api/v1/articles/${articleId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete article');
      }
      return true;
    } catch (error) {
      console.error('Error deleting article:', error);
      return false;
    }
  },

  async moveArticle(articleId, newParentId, knowledgeId) {
    try {
      const response = await fetch('/api/v1/articles/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: parseInt(articleId),
          new_parent_id: newParentId ? parseInt(newParentId) : 0,
          knowledge_id: parseInt(knowledgeId)
        })
      });
      if (!response.ok) {
        throw new Error('Failed to move article');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error moving article:', error);
      return null;
    }
  }
};