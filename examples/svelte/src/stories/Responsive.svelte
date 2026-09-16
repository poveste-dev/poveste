<div class="target">
  {#each Array.from({ length: 100 }, (_, i) => i) as n (n)}
    <p>Responsive</p>
  {/each}
</div>

<style>
  .target p {
    margin: 2px;
    padding: 12px;
    background-color: rgb(188, 130, 255);
    color: black;
  }

  @media (max-width: 768px) {
    .target p {
      background-color: rgb(115, 255, 173);
    }
  }
</style>
