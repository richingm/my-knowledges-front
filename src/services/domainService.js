export const domainService = {
  async listDomains() {
    try {
      const response = await fetch('/api/v1/domains');
      if (!response.ok) {
        throw new Error('Failed to fetch domains');
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error fetching domains:', error);
      return [];
    }
  }
};