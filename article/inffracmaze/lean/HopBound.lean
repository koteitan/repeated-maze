import Mathlib

/-!
# Siggy's infinite-hop rule cannot produce ω^ω hops

A solution of an infinite fractal maze under Siggy's rules is a finite path
whose hops are justified by finite paths that use only previously justified
hops. Such a derivation is a finite tree, encoded here by `Shape`.

Unfolding a hop `h` justified by `P : U1 → TU1` and `Q : V2 → TV2` gives the
hop points it crosses, in traversal order:

  X(h) = (ω copies of X(P)) + (centre point) + (ω copies of X(Q), reversed)

`Shape.T s` is that linear order. The main theorem says that `Shape.T s`
contains neither ω^(rank s) nor its reverse, so it never contains ω^ω.
-/

namespace InfHop

open OrderDual

/-! ## ω^r as a concrete order -/

/-- `W r` is ω^r: `r`-tuples of naturals ordered lexicographically. -/
@[reducible] def W : ℕ → Type
  | 0 => Unit
  | r + 1 => ℕ ×ₗ W r

instance instLinearOrderW : (r : ℕ) → LinearOrder (W r)
  | 0 => inferInstanceAs (LinearOrder Unit)
  | r + 1 =>
    letI := instLinearOrderW r
    inferInstanceAs (LinearOrder (ℕ ×ₗ W r))

instance instInhabitedW : (r : ℕ) → Inhabited (W r)
  | 0 => ⟨()⟩
  | r + 1 =>
    letI := instInhabitedW r
    ⟨toLex (0, default)⟩

theorem lexLt {α β : Type*} [Preorder α] [Preorder β] (a b : α ×ₗ β) :
    a < b ↔ (ofLex a).1 < (ofLex b).1 ∨
      (ofLex a).1 = (ofLex b).1 ∧ (ofLex a).2 < (ofLex b).2 :=
  Prod.Lex.lt_iff

theorem lexLe {α β : Type*} [Preorder α] [Preorder β] (a b : α ×ₗ β) :
    a ≤ b ↔ (ofLex a).1 < (ofLex b).1 ∨
      (ofLex a).1 = (ofLex b).1 ∧ (ofLex a).2 ≤ (ofLex b).2 :=
  Prod.Lex.le_iff

theorem lexLe_fst {α β : Type*} [PartialOrder α] [Preorder β] {a b : α ×ₗ β}
    (h : a ≤ b) : (ofLex a).1 ≤ (ofLex b).1 := by
  rcases (lexLe a b).mp h with h | ⟨h, _⟩
  · exact h.le
  · exact h.le

/-- Every element of `W r` has a copy of `W r` above it. -/
theorem shiftUp : ∀ (r : ℕ) (x : W r), ∃ g : W r ↪o W r, ∀ y, x ≤ g y
  | 0, _ => ⟨(OrderIso.refl _).toOrderEmbedding, fun _ => le_of_eq (Subsingleton.elim _ _)⟩
  | r + 1, x => by
    let g : W (r + 1) → W (r + 1) :=
      fun y => toLex ((ofLex x).1 + 1 + (ofLex y).1, (ofLex y).2)
    have hg : StrictMono g := by
      intro a b hab
      rcases (lexLt (α := ℕ) (β := W r) a b).mp hab with h | ⟨h1, h2⟩
      · exact (lexLt (α := ℕ) (β := W r) (g a) (g b)).mpr
          (Or.inl (by simp only [g, ofLex_toLex]; omega))
      · exact (lexLt (α := ℕ) (β := W r) (g a) (g b)).mpr
          (Or.inr ⟨by simp only [g, ofLex_toLex]; omega, by simpa [g] using h2⟩)
    refine ⟨OrderEmbedding.ofStrictMono g hg, fun y => le_of_lt ?_⟩
    exact (lexLt (α := ℕ) (β := W r) x (g y)).mpr
      (Or.inl (by simp only [g, ofLex_toLex]; omega))

/-- `W r` sits inside `W (r + 1)` as its first block. -/
def up (r : ℕ) : W r ↪o W (r + 1) :=
  OrderEmbedding.ofStrictMono (fun w => (toLex (0, w) : W (r + 1))) (by
    intro a b hab
    exact (lexLt (α := ℕ) (β := W r) _ _).mpr (Or.inr ⟨rfl, hab⟩))

/-! ## No copy of ω^r -/

/-- `L` contains neither ω^r nor its reverse. -/
def Phi (r : ℕ) (L : Type*) [LinearOrder L] : Prop :=
  IsEmpty (W r ↪o L) ∧ IsEmpty (W r ↪o Lᵒᵈ)

variable {L L₁ L₂ A : Type*} [LinearOrder L] [LinearOrder L₁] [LinearOrder L₂]
  [LinearOrder A]

theorem isEmpty_of_iso {L' : Type*} [LinearOrder L'] {r : ℕ} (e : L ≃o L')
    (h : IsEmpty (W r ↪o L')) : IsEmpty (W r ↪o L) :=
  ⟨fun f => h.false (f.trans e.toOrderEmbedding)⟩

theorem noW_succ {r : ℕ} (h : IsEmpty (W r ↪o L)) : IsEmpty (W (r + 1) ↪o L) :=
  ⟨fun f => h.false ((up r).trans f)⟩

theorem noW_mono {r r' : ℕ} (hr : r ≤ r') (h : IsEmpty (W r ↪o L)) :
    IsEmpty (W r' ↪o L) := by
  induction r', hr using Nat.le_induction with
  | base => exact h
  | succ n _ ih => exact noW_succ ih

theorem phi_mono {r r' : ℕ} (hr : r ≤ r') (h : Phi r L) : Phi r' L :=
  ⟨noW_mono hr h.1, noW_mono hr h.2⟩

/-- A one-point order contains no ω^(r+1). -/
theorem noW_subsingleton [Subsingleton L] (r : ℕ) : IsEmpty (W (r + 1) ↪o L) := by
  refine ⟨fun f => ?_⟩
  have h := f.injective (Subsingleton.elim (f (toLex (0, default)))
    (f (toLex (1, default))))
  have := congrArg (fun z : W (r + 1) => (ofLex z).1) h
  simp at this

/-- Splitting a copy of `M` across `L₁ ⊕ₗ L₂`. -/
theorem sum_split {M : Type*} [LinearOrder M]
    (hM : ∀ x : M, ∃ g : M ↪o M, ∀ y, x ≤ g y) (f : M ↪o L₁ ⊕ₗ L₂) :
    Nonempty (M ↪o L₁) ∨ Nonempty (M ↪o L₂) := by
  classical
  by_cases h : ∃ x b, ofLex (f x) = Sum.inr b
  · obtain ⟨x, b, hx⟩ := h
    obtain ⟨g, hg⟩ := hM x
    have key : ∀ y, ∃ c, ofLex (f (g y)) = Sum.inr c := by
      intro y
      have hle : f x ≤ f (g y) := f.le_iff_le.mpr (hg y)
      rcases hfy : ofLex (f (g y)) with a | c
      · exfalso
        have h2 : toLex (Sum.inr b : L₁ ⊕ L₂) ≤ toLex (Sum.inl a) := by
          rw [← hx, ← hfy]
          exact hle
        exact Sum.Lex.not_inr_le_inl h2
      · exact ⟨c, rfl⟩
    choose e he using key
    right
    refine ⟨OrderEmbedding.ofStrictMono e ?_⟩
    intro y z hyz
    have h1 : f (g y) < f (g z) := f.lt_iff_lt.mpr (g.lt_iff_lt.mpr hyz)
    have h2 : toLex (Sum.inr (e y) : L₁ ⊕ L₂) < toLex (Sum.inr (e z)) := by
      rw [← he y, ← he z]
      exact h1
    exact Sum.Lex.inr_lt_inr_iff.mp h2
  · push Not at h
    have key : ∀ y, ∃ a, ofLex (f y) = Sum.inl a := by
      intro y
      rcases hfy : ofLex (f y) with a | c
      · exact ⟨a, rfl⟩
      · exact absurd hfy (h y c)
    choose e he using key
    left
    refine ⟨OrderEmbedding.ofStrictMono e ?_⟩
    intro y z hyz
    have h1 : f y < f z := f.lt_iff_lt.mpr hyz
    have h2 : toLex (Sum.inl (e y) : L₁ ⊕ L₂) < toLex (Sum.inl (e z)) := by
      rw [← he y, ← he z]
      exact h1
    exact Sum.Lex.inl_lt_inl_iff.mp h2

theorem noW_sum {r : ℕ} (h₁ : IsEmpty (W r ↪o L₁)) (h₂ : IsEmpty (W r ↪o L₂)) :
    IsEmpty (W r ↪o L₁ ⊕ₗ L₂) :=
  ⟨fun f => (sum_split (shiftUp r) f).elim (fun ⟨g⟩ => h₁.false g)
    (fun ⟨g⟩ => h₂.false g)⟩

/-- Lemma 1: a finite sum keeps `Phi`. -/
theorem phi_sum {r : ℕ} (h₁ : Phi r L₁) (h₂ : Phi r L₂) : Phi r (L₁ ⊕ₗ L₂) :=
  ⟨noW_sum h₁.1 h₂.1,
    isEmpty_of_iso (OrderIso.sumLexDualAntidistrib L₁ L₂) (noW_sum h₂.2 h₁.2)⟩

theorem phi_dual {r : ℕ} (h : Phi r L) : Phi r Lᵒᵈ :=
  ⟨h.2, isEmpty_of_iso (OrderIso.dualDual L).symm h.1⟩

/-- Lemma 2, forward part: ω copies of an order without ω^r contain no ω^(r+1). -/
theorem prod_forward {r : ℕ} (hA : IsEmpty (W r ↪o A)) :
    IsEmpty (W (r + 1) ↪o ℕ ×ₗ A) := by
  classical
  refine ⟨fun f => ?_⟩
  let blk : W r → W (r + 1) := fun w => toLex (0, w)
  let top : W (r + 1) := toLex (1, default)
  have hblk : ∀ w, blk w < top := fun w =>
    (lexLt (α := ℕ) (β := W r) _ _).mpr (Or.inl (by simp [blk, top]))
  let idx : W r → ℕ := fun w => (ofLex (f (blk w))).1
  let K := (ofLex (f top)).1
  have hbound : ∀ w, idx w ≤ K := fun w => lexLe_fst (f.le_iff_le.mpr (hblk w).le)
  let P : ℕ → Prop := fun n => ∃ w, idx w = n
  have hm : P (Nat.findGreatest P K) := Nat.findGreatest_spec (hbound default) ⟨default, rfl⟩
  have hmax : ∀ w, idx w ≤ Nat.findGreatest P K := fun w =>
    Nat.le_findGreatest (hbound w) ⟨w, rfl⟩
  obtain ⟨x, hx⟩ := hm
  obtain ⟨g, hg⟩ := shiftUp r x
  have hconst : ∀ w, idx (g w) = idx x := by
    intro w
    refine le_antisymm (hx ▸ hmax _) ?_
    have h1 : blk x ≤ blk (g w) :=
      (lexLe (α := ℕ) (β := W r) _ _).mpr (Or.inr ⟨rfl, hg w⟩)
    exact lexLe_fst (f.le_iff_le.mpr h1)
  let e : W r → A := fun w => (ofLex (f (blk (g w)))).2
  have he : StrictMono e := by
    intro a b hab
    have h1 : blk (g a) < blk (g b) :=
      (lexLt (α := ℕ) (β := W r) _ _).mpr (Or.inr ⟨rfl, g.lt_iff_lt.mpr hab⟩)
    rcases (lexLt _ _).mp (f.lt_iff_lt.mpr h1) with h | ⟨_, h⟩
    · have ha := hconst a
      have hb := hconst b
      simp only [idx] at ha hb
      omega
    · exact h
  exact hA.false (OrderEmbedding.ofStrictMono e he)

/-- Lemma 2, reversed part: ω copies, reversed, of an order without reversed ω^r
contain no reversed ω^r. -/
theorem prod_dual {r : ℕ} (hA : IsEmpty (W r ↪o Aᵒᵈ)) :
    IsEmpty (W r ↪o (ℕ ×ₗ A)ᵒᵈ) := by
  classical
  refine ⟨fun f => ?_⟩
  let idx : W r → ℕ := fun w => (ofLex (ofDual (f w))).1
  have hP : ∃ n, ∃ w, idx w = n := ⟨_, default, rfl⟩
  obtain ⟨x, hx⟩ := Nat.find_spec hP
  have hmin : ∀ w, Nat.find hP ≤ idx w := fun w => Nat.find_min' hP ⟨w, rfl⟩
  obtain ⟨g, hg⟩ := shiftUp r x
  have hconst : ∀ w, idx (g w) = idx x := by
    intro w
    refine le_antisymm ?_ (hx ▸ hmin _)
    have h1 : f x ≤ f (g w) := f.le_iff_le.mpr (hg w)
    exact lexLe_fst (show ofDual (f (g w)) ≤ ofDual (f x) from h1)
  let e : W r → Aᵒᵈ := fun w => toDual (ofLex (ofDual (f (g w)))).2
  have he : StrictMono e := by
    intro a b hab
    have h1 : f (g a) < f (g b) := f.lt_iff_lt.mpr (g.lt_iff_lt.mpr hab)
    have h2 : ofDual (f (g b)) < ofDual (f (g a)) := h1
    rcases (lexLt _ _).mp h2 with h | ⟨_, h⟩
    · have ha := hconst a
      have hb := hconst b
      simp only [idx] at ha hb
      omega
    · exact h
  exact hA.false (OrderEmbedding.ofStrictMono e he)

/-- ω copies of an order with `Phi r` have `Phi (r + 1)`. -/
theorem phi_prod {r : ℕ} (h : Phi r A) : Phi (r + 1) (ℕ ×ₗ A) :=
  ⟨prod_forward h.1, noW_succ (prod_dual h.2)⟩

theorem phi_unit (r : ℕ) : Phi (r + 1) Unit :=
  ⟨noW_subsingleton r, noW_subsingleton r⟩

/-! ## Finite derivations and their hop points -/

/-- A finite derivation: a path is a concatenation of hops, possibly traversed
backwards, and a hop carries its two justifying paths `P` and `Q`. -/
inductive Shape
  | empty
  | seq (a b : Shape)
  | rev (a : Shape)
  | hop (p q : Shape)

/-- Hop points crossed, in traversal order. -/
@[reducible] def Shape.T : Shape → Type
  | .empty => Fin 0
  | .seq a b => a.T ⊕ₗ b.T
  | .rev a => (a.T)ᵒᵈ
  | .hop p q => (ℕ ×ₗ p.T) ⊕ₗ (Unit ⊕ₗ (ℕ ×ₗ q.T)ᵒᵈ)

instance Shape.instLinearOrder : (s : Shape) → LinearOrder s.T
  | .empty => inferInstanceAs (LinearOrder (Fin 0))
  | .seq a b =>
    letI := Shape.instLinearOrder a
    letI := Shape.instLinearOrder b
    inferInstanceAs (LinearOrder (a.T ⊕ₗ b.T))
  | .rev a =>
    letI := Shape.instLinearOrder a
    inferInstanceAs (LinearOrder (a.T)ᵒᵈ)
  | .hop p q =>
    letI := Shape.instLinearOrder p
    letI := Shape.instLinearOrder q
    inferInstanceAs (LinearOrder ((ℕ ×ₗ p.T) ⊕ₗ (Unit ⊕ₗ (ℕ ×ₗ q.T)ᵒᵈ)))

/-- Nesting depth of the derivation. -/
def Shape.rank : Shape → ℕ
  | .empty => 0
  | .seq a b => max a.rank b.rank
  | .rev a => a.rank
  | .hop p q => max p.rank q.rank + 1

/-- Main lemma: the hop points of a derivation of depth `r` contain neither
ω^r nor its reverse. -/
theorem main : ∀ s : Shape, Phi s.rank s.T
  | .empty => ⟨⟨fun f => (f default).elim0⟩, ⟨fun f => (ofDual (f default)).elim0⟩⟩
  | .seq a b =>
    phi_sum (phi_mono (le_max_left a.rank b.rank) (main a))
      (phi_mono (le_max_right a.rank b.rank) (main b))
  | .rev a => phi_dual (main a)
  | .hop p q =>
    phi_sum (phi_prod (phi_mono (le_max_left p.rank q.rank) (main p)))
      (phi_sum (phi_unit _)
        (phi_dual (phi_prod (phi_mono (le_max_right p.rank q.rank) (main q)))))

/-! ## No ω^ω -/

/-- ω^ω realised as `Σₗ R, ω^R` (= 1 + ω + ω² + ⋯). -/
abbrev Wω := Σₗ R, W R

/-- `ω^R` sits inside `ω^ω`. -/
def incl (R : ℕ) : W R ↪o Wω :=
  OrderEmbedding.ofStrictMono (fun w => toLex ⟨R, w⟩) (fun _ _ h => Sigma.Lex.right _ _ h)

/-- **Theorem.** Under Siggy's rule, the hop points of any solution contain no
copy of ω^ω. -/
theorem no_omega_pow_omega (s : Shape) : IsEmpty (Wω ↪o s.T) :=
  ⟨fun f => (main s).1.false ((incl s.rank).trans f)⟩

/-- The same with the reversed order. -/
theorem no_omega_pow_omega_rev (s : Shape) : IsEmpty (Wω ↪o (s.T)ᵒᵈ) :=
  ⟨fun f => (main s).2.false ((incl s.rank).trans f)⟩

/-! ## Sanity check: the bound is not vacuous -/

/-- Maze 03: `hop₁ : 1 ↔ 2` justified by edges only. -/
abbrev hop1 : Shape := .hop .empty .empty

/-- Maze 03: `hop₂ : 1 ↔ 3` justified by `1 ⇝ 2 – B1` (uses `hop₁`) and an edge. -/
abbrev hop2 : Shape := .hop (.seq hop1 .empty) .empty

/-- The depth-2 derivation of maze 03 does contain ω, so `main` is sharp there. -/
example : Nonempty (W 1 ↪o hop2.T) := by
  let c : hop1.T := toLex (Sum.inr (toLex (Sum.inl ())))
  let e : W 1 → hop2.T := fun w =>
    toLex (Sum.inl (toLex ((ofLex w).1, (toLex (Sum.inl c) : (Shape.seq hop1 .empty).T))))
  refine ⟨OrderEmbedding.ofStrictMono e ?_⟩
  intro a b hab
  have h1 : (ofLex a).1 < (ofLex b).1 := by
    rcases (lexLt (α := ℕ) (β := W 0) a b).mp hab with h | ⟨_, h⟩
    · exact h
    · exact absurd h (by simp)
  exact Sum.Lex.inl_lt_inl_iff.mpr ((lexLt _ _).mpr (Or.inl h1))

end InfHop

#print axioms InfHop.no_omega_pow_omega
