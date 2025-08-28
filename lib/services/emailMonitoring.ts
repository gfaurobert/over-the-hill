/**
 * Email Monitoring and Metrics Utility
 * Provides monitoring capabilities for email notifications
 */

interface EmailMetrics {
  totalAttempts: number;
  successfulSends: number;
  failedSends: number;
  averageResponseTime: number;
  lastSuccessfulSend: Date | null;
  lastFailedSend: Date | null;
  recentErrors: Array<{
    timestamp: Date;
    error: string;
    requesterEmail: string;
  }>;
}

class EmailMonitoring {
  private metrics: EmailMetrics = {
    totalAttempts: 0,
    successfulSends: 0,
    failedSends: 0,
    averageResponseTime: 0,
    lastSuccessfulSend: null,
    lastFailedSend: null,
    recentErrors: [],
  };

  private responseTimes: number[] = [];
  private readonly maxRecentErrors = 10;

  /**
   * Record a successful email send
   */
  recordSuccess(responseTime: number, requesterEmail: string): void {
    this.metrics.totalAttempts++;
    this.metrics.successfulSends++;
    this.metrics.lastSuccessfulSend = new Date();
    
    this.responseTimes.push(responseTime);
    this.updateAverageResponseTime();
    
    console.log(`📊 Email Metrics - Success Rate: ${this.getSuccessRate()}% | Avg Response: ${this.metrics.averageResponseTime}ms`);
  }

  /**
   * Record a failed email send
   */
  recordFailure(error: string, requesterEmail: string): void {
    this.metrics.totalAttempts++;
    this.metrics.failedSends++;
    this.metrics.lastFailedSend = new Date();
    
    // Add to recent errors (keep only the most recent)
    this.metrics.recentErrors.unshift({
      timestamp: new Date(),
      error: error.substring(0, 200), // Limit error message length
      requesterEmail,
    });
    
    if (this.metrics.recentErrors.length > this.maxRecentErrors) {
      this.metrics.recentErrors = this.metrics.recentErrors.slice(0, this.maxRecentErrors);
    }
    
    console.log(`📊 Email Metrics - Success Rate: ${this.getSuccessRate()}% | Recent Failures: ${this.metrics.failedSends}`);
    
    // Alert if failure rate is high
    if (this.getFailureRate() > 50 && this.metrics.totalAttempts >= 5) {
      console.warn(`🚨 HIGH EMAIL FAILURE RATE: ${this.getFailureRate()}% (${this.metrics.failedSends}/${this.metrics.totalAttempts})`);
    }
  }

  /**
   * Get current email metrics
   */
  getMetrics(): EmailMetrics {
    return { ...this.metrics };
  }

  /**
   * Get success rate as percentage
   */
  getSuccessRate(): number {
    if (this.metrics.totalAttempts === 0) return 0;
    return Math.round((this.metrics.successfulSends / this.metrics.totalAttempts) * 100);
  }

  /**
   * Get failure rate as percentage
   */
  getFailureRate(): number {
    if (this.metrics.totalAttempts === 0) return 0;
    return Math.round((this.metrics.failedSends / this.metrics.totalAttempts) * 100);
  }

  /**
   * Log current metrics summary
   */
  logSummary(): void {
    console.log('\n📊 EMAIL NOTIFICATION METRICS SUMMARY');
    console.log('=====================================');
    console.log(`Total Attempts: ${this.metrics.totalAttempts}`);
    console.log(`Successful Sends: ${this.metrics.successfulSends}`);
    console.log(`Failed Sends: ${this.metrics.failedSends}`);
    console.log(`Success Rate: ${this.getSuccessRate()}%`);
    console.log(`Average Response Time: ${this.metrics.averageResponseTime}ms`);
    console.log(`Last Successful Send: ${this.metrics.lastSuccessfulSend?.toLocaleString() || 'Never'}`);
    console.log(`Last Failed Send: ${this.metrics.lastFailedSend?.toLocaleString() || 'Never'}`);
    
    if (this.metrics.recentErrors.length > 0) {
      console.log('\nRecent Errors:');
      this.metrics.recentErrors.slice(0, 3).forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.timestamp.toLocaleString()}: ${error.error}`);
      });
    }
    console.log('=====================================\n');
  }

  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  resetMetrics(): void {
    this.metrics = {
      totalAttempts: 0,
      successfulSends: 0,
      failedSends: 0,
      averageResponseTime: 0,
      lastSuccessfulSend: null,
      lastFailedSend: null,
      recentErrors: [],
    };
    this.responseTimes = [];
    
    console.log('📊 Email metrics reset');
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(): void {
    if (this.responseTimes.length === 0) return;
    
    // Keep only the last 100 response times for rolling average
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
    
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageResponseTime = Math.round(sum / this.responseTimes.length);
  }

  /**
   * Check if email system health is good
   */
  isHealthy(): boolean {
    // Consider healthy if:
    // - Success rate > 80% (if we have enough data)
    // - No recent failures in last 5 attempts
    if (this.metrics.totalAttempts < 3) return true; // Not enough data
    
    const successRate = this.getSuccessRate();
    const recentFailures = this.metrics.recentErrors.filter(
      error => Date.now() - error.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    ).length;
    
    return successRate >= 80 && recentFailures < 3;
  }

  /**
   * Get health status string
   */
  getHealthStatus(): string {
    if (this.metrics.totalAttempts === 0) return '🟡 No Data';
    
    const isHealthy = this.isHealthy();
    const successRate = this.getSuccessRate();
    
    if (isHealthy && successRate >= 95) return '🟢 Excellent';
    if (isHealthy && successRate >= 80) return '🟢 Good';
    if (successRate >= 50) return '🟡 Warning';
    return '🔴 Critical';
  }
}

// Export singleton instance
export const emailMonitoring = new EmailMonitoring();
export default emailMonitoring;