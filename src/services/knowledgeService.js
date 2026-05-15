export const knowledgeService = {
  async getKnowledgeTree(domainId) {
    try {
      const response = await fetch(`/api/v1/knowledge-tree?domain_id=${domainId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch knowledge tree');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching knowledge tree:', error);
      return [];
    }
  },
  
  async createKnowledge(knowledgeData) {
    try {
      const response = await fetch('/api/v1/knowledges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(knowledgeData)
      });
      if (!response.ok) {
        throw new Error('Failed to create knowledge');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating knowledge:', error);
      return null;
    }
  },
  
  async deleteKnowledge(knowledgeId) {
    try {
      const response = await fetch(`/api/v1/knowledges/${knowledgeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Failed to delete knowledge');
      }
      return true;
    } catch (error) {
      console.error('Error deleting knowledge:', error);
      return false;
    }
  },

  async moveKnowledge(knowledgeId, newParentId, domainId) {
    try {
      const response = await fetch('/api/v1/knowledges/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: parseInt(knowledgeId),
          new_parent_id: newParentId ? parseInt(newParentId) : 0,
          domain_id: parseInt(domainId)
        })
      });
      if (!response.ok) {
        throw new Error('Failed to move knowledge');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error moving knowledge:', error);
      return null;
    }
  }
};