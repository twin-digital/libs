export {}

describe('s3-repository', () => {
  it('is slow', async () => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, 4000)
    })
  })
})
